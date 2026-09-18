const pool = require("../config/db");
// this is the code of the first controller 
async function startSpin(req, res) {

  const client = await pool.connect();

  try {

    const { roomId } = req.params;
    const { userId } = req.body || {};

    // 1. Validate input
    if (!roomId || !userId) {
      return res.status(400).json({
        message: "roomId and userId are required"
      });
    }


    // Start transaction
    await client.query("BEGIN");


    // 2. Get room
    const roomResult = await client.query(
      `SELECT
                id,
                room_code,
                owner_id,
                status
             FROM rooms
             WHERE id = $1
             FOR UPDATE`,
      [roomId]
    );



    if (roomResult.rows.length === 0) {

      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Room does not exist"
      });
    }

    const room = roomResult.rows[0];


    console.log("BODY USER ID:", userId);
    console.log("DB OWNER ID:", room.owner_id);
    console.log("ARE THEY SAME:", room.owner_id === userId);

    // 3. Check room owner
    if (room.owner_id !== userId) {

      await client.query("ROLLBACK");

      return res.status(403).json({
        message: "Caller is not the room owner"
      });
    }


    // 4. Check room status
    if (room.status !== "open") {

      await client.query("ROLLBACK");

      return res.status(409).json({
        message: "Room is not available for a new spin"
      });
    }


    // 5. Get connected members
    const membersResult = await client.query(
      `SELECT
                u.id AS "userId",
                u.username
             FROM room_members rm
             JOIN users u
             ON u.id = rm.user_id
             WHERE rm.room_id = $1
             AND rm.is_connected = true
             ORDER BY rm.joined_at`,
      [roomId]
    );

    const members = membersResult.rows;


    // 6. Check participant count
    if (members.length < 3) {

      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "At least 3 connected members are required"
      });
    }

    if (members.length > 20) {

      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Maximum 20 participants are allowed"
      });
    }


    // 7. Create spin
    const spinResult = await client.query(
      `INSERT INTO spins
                (room_id, status, started_by, started_at)
             VALUES
                ($1, 'running', $2, NOW())
             RETURNING
                id,
                room_id,
                status,
                started_at`,
      [roomId, userId]
    );

    const spin = spinResult.rows[0];


    // 8. Add participants to spin
    for (const member of members) {

      await client.query(
        `INSERT INTO spin_participants
                    (spin_id, user_id, status)
                 VALUES
                    ($1, $2, 'active')`,
        [spin.id, member.userId]
      );
    }


    // 9. Change room status
    await client.query(
      `UPDATE rooms
             SET status = 'in_spin'
             WHERE id = $1`,
      [roomId]
    );


    // 10. Log spin started event
    await client.query(
      `INSERT INTO spin_events
                (spin_id, event_type, payload)
             VALUES
                ($1, 'spin_started', $2)`,
      [
        spin.id,
        JSON.stringify({
          roomId: roomId,
          startedBy: userId,
          participantCount: members.length
        })
      ]
    );


    // Everything successful
    await client.query("COMMIT");


    // 11. Send response
    return res.status(201).json({

      spinId: spin.id,

      roomId: spin.room_id,

      status: spin.status,

      startedAt: spin.started_at,

      eligibleParticipants: members

    });


    // Later:
    // spinEngine.runElimination(spin.id);

  } catch (error) {

    // Rollback if something failed
    await client.query("ROLLBACK");

    console.error("Start spin error:", error);


    // Duplicate active spin
    if (error.code === "23505") {
      return res.status(409).json({
        message: "A spin is already running in this room"
      });
    }


    return res.status(500).json({
      message: "Failed to start spin"
    });

  } finally {

    // Always release DB connection
    client.release();
  }
}
async function getSpinState(req, res) {
    try {

        const { roomId } = req.params;

        // 1. Validate roomId
        if (!roomId) {
            return res.status(400).json({
                message: "roomId is required"
            });
        }


        // 2. Get latest spin for this room
        const spinResult = await pool.query(
            `SELECT
                id,
                room_id,
                status,
                started_at,
                winner_id
             FROM spins
             WHERE room_id = $1
             ORDER BY started_at DESC
             LIMIT 1`,
            [roomId]
        );


        // 3. No spin exists
        if (spinResult.rows.length === 0) {
            return res.status(200).json({
                spinId: null,
                status: null,
                participants: [],
                winnerId: null
            });
        }


        const spin = spinResult.rows[0];


        // 4. Get spin participants
        const participantsResult = await pool.query(
            `SELECT
                u.id AS "userId",
                u.username,
                sp.status,
                sp.elimination_order AS "eliminationOrder"
             FROM spin_participants sp
             JOIN users u
             ON u.id = sp.user_id
             WHERE sp.spin_id = $1
             ORDER BY
                sp.elimination_order NULLS LAST,
                sp.id`,
            [spin.id]
        );


        // 5. Return spin state
        return res.status(200).json({

            spinId: spin.id,

            status: spin.status,

            startedAt: spin.started_at,

            participants: participantsResult.rows,

            winnerId: spin.winner_id

        });

    } catch (error) {

        console.error("Get spin state error:", error);

        return res.status(500).json({
            message: "Failed to get spin state"
        });
    }
}

module.exports = { startSpin, getSpinState };
