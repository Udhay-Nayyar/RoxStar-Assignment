const pool = require("../config/db");


// first controller starts here 

async function createRoom(req, res) {
  try {
    const { username, deviceId } = req.body || {};

    // 1. Basic validation
    if (!username || !deviceId) {
      return res.status(400).json({
        message: "username and deviceId are required"
      });
    }

    // 2. Find user by deviceId
    let userResult = await pool.query(
      `SELECT id FROM users WHERE device_id = $1`,
      [deviceId]
    );

    let userId;

    // 3. If user doesn't exist, create user
    if (userResult.rows.length === 0) {
      const newUser = await pool.query(
        `INSERT INTO users (username, device_id)
                 VALUES ($1, $2)
                 RETURNING id`,
        [username, deviceId]
      );

      userId = newUser.rows[0].id;
    } else {
      userId = userResult.rows[0].id;

      // Update username if user already exists
      await pool.query(
        `UPDATE users
                 SET username = $1
                 WHERE id = $2`,
        [username, userId]
      );
    }

    // 4. Generate a simple room code
    const roomCode = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    // 5. Create room
    const roomResult = await pool.query(
      `INSERT INTO rooms (room_code, owner_id)
             VALUES ($1, $2)
             RETURNING id, room_code, owner_id, status, created_at`,
      [roomCode, userId]
    );

    const room = roomResult.rows[0];

    // 6. Add owner to room_members
    await pool.query(
      `INSERT INTO room_members
             (room_id, user_id, is_connected)
             VALUES ($1, $2, $3)`,
      [room.id, userId, true]
    );

    // 7. Send response
    return res.status(201).json({
      roomId: room.id,
      roomCode: room.room_code,
      ownerId: room.owner_id,
      userId: userId,
      status: room.status,
      createdAt: room.created_at
    });

  } catch (error) {
    console.error("Create room error:", error);

    return res.status(500).json({
      message: "Failed to create room"
    });
  }
}




// first controller code ends here 


// second controller of joining the room is here 


async function joinRoom(req, res) {
  try {

    const { roomCode } = req.params;
    const { username, deviceId } = req.body || {};

    // 1. Validate input
    if (!roomCode || !username || !deviceId) {
      return res.status(400).json({
        message: "roomCode, username and deviceId are required"
      });
    }


    // 2. Find room
    const roomResult = await pool.query(
      `SELECT id, room_code, status
             FROM rooms
             WHERE room_code = $1`,
      [roomCode]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({
        message: "Room code does not exist"
      });
    }

    const room = roomResult.rows[0];


    // 3. Check room status
    if (room.status !== "open") {
      return res.status(400).json({
        message: "Room is not open"
      });
    }


    // 4. Find user using deviceId
    const userResult = await pool.query(
      `SELECT id
             FROM users
             WHERE device_id = $1`,
      [deviceId]
    );

    let userId;


    // 5. Create user if not found
    if (userResult.rows.length === 0) {

      const newUser = await pool.query(
        `INSERT INTO users (username, device_id)
                 VALUES ($1, $2)
                 RETURNING id`,
        [username, deviceId]
      );

      userId = newUser.rows[0].id;

    } else {

      userId = userResult.rows[0].id;

      // Update username
      await pool.query(
        `UPDATE users
                 SET username = $1
                 WHERE id = $2`,
        [username, userId]
      );
    }


    // 6. Check if user is already a member
    const memberResult = await pool.query(
      `SELECT id
             FROM room_members
             WHERE room_id = $1
             AND user_id = $2`,
      [room.id, userId]
    );


    // 7. Existing member
    if (memberResult.rows.length > 0) {

      await pool.query(
        `UPDATE room_members
                 SET is_connected = true,
                     left_at = NULL
                 WHERE room_id = $1
                 AND user_id = $2`,
        [room.id, userId]
      );

    }


    // 8. New member
    else {

      await pool.query(
        `INSERT INTO room_members
                 (room_id, user_id, is_connected)
                 VALUES ($1, $2, true)`,
        [room.id, userId]
      );
    }


    // 9. Get all members of the room
    const membersResult = await pool.query(
      `SELECT
                u.id AS "userId",
                u.username,
                rm.is_connected AS "isConnected"
             FROM room_members rm
             JOIN users u
             ON u.id = rm.user_id
             WHERE rm.room_id = $1
             ORDER BY rm.joined_at`,
      [room.id]
    );


    // 10. Return room information
    return res.status(200).json({

      roomId: room.id,

      userId: userId,

      roomCode: room.room_code,

      status: room.status,

      members: membersResult.rows

    });

  } catch (error) {

    console.error("Join room error:", error);

    return res.status(500).json({
      message: "Failed to join room"
    });
  }
}



// second controller ends here

async function leaveRoom(req, res) {
  try {
    const { roomId } = req.params;
    const { userId } = req.body || {};

    // Validate input
    if (!roomId || !userId) {
      return res.status(400).json({
        message: "roomId and userId are required"
      });
    }

    // Check if user is a member
    const memberResult = await pool.query(
      `SELECT id
             FROM room_members
             WHERE room_id = $1
             AND user_id = $2`,
      [roomId, userId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({
        message: "User is not a member of this room"
      });
    }

    // Mark user as disconnected
    const updateResult = await pool.query(
      `UPDATE room_members
             SET is_connected = false,
                 left_at = NOW()
             WHERE room_id = $1
             AND user_id = $2
             RETURNING room_id, user_id, left_at`,
      [roomId, userId]
    );

    const result = updateResult.rows[0];

    return res.status(200).json({
      roomId: result.room_id,
      userId: result.user_id,
      leftAt: result.left_at
    });

  } catch (error) {

    console.error("Leave room error:", error);

    return res.status(500).json({
      message: "Failed to leave room"
    });
  }
}


// =====================================================
// GET ROOM STATE
// =====================================================

async function getRoomState(req, res) {
  try {

    const { roomId } = req.params;

    // 1. Validate roomId
    if (!roomId) {
      return res.status(400).json({
        message: "roomId is required"
      });
    }

    console.log("ROOM ID RECEIVED:", roomId);

    // 2. Get room
    const roomResult = await pool.query(
      `SELECT
                id,
                room_code,
                owner_id,
                status,
                created_at
             FROM rooms
             WHERE id = $1`,
      [roomId]
    );

    // IMPORTANT: roomResult is declared above
    console.log("ROOM QUERY RESULT:", roomResult.rows);

    if (roomResult.rows.length === 0) {
      return res.status(404).json({
        message: "Room does not exist"
      });
    }

    const room = roomResult.rows[0];


    // 3. Get room members
    const membersResult = await pool.query(
      `SELECT
                u.id AS "userId",
                u.username,
                rm.is_connected AS "isConnected"
             FROM room_members rm
             JOIN users u
             ON u.id = rm.user_id
             WHERE rm.room_id = $1
             ORDER BY rm.joined_at`,
      [roomId]
    );


    // 4. Get currently running spin
    const spinResult = await pool.query(
      `SELECT
                id,
                status,
                started_by,
                started_at
             FROM spins
             WHERE room_id = $1
             AND status = 'running'
             LIMIT 1`,
      [roomId]
    );


    // 5. Prepare activeSpin
    let activeSpin = null;

    if (spinResult.rows.length > 0) {

      const spin = spinResult.rows[0];

      activeSpin = {
        spinId: spin.id,
        status: spin.status,
        startedBy: spin.started_by,
        startedAt: spin.started_at
      };
    }


    // 6. Return complete room state
    return res.status(200).json({

      roomId: room.id,

      roomCode: room.room_code,

      status: room.status,

      ownerId: room.owner_id,

      members: membersResult.rows,

      activeSpin: activeSpin

    });

  } catch (error) {

    console.error("Get room state error:", error);

    return res.status(500).json({
      message: "Failed to get room state"
    });
  }
}

module.exports = { createRoom, joinRoom, leaveRoom, getRoomState };
