const { pool } = require('../config/db');

const memberColumns = `
  rm.id,
  rm.room_id AS "roomId",
  rm.user_id AS "userId",
  rm.socket_id AS "socketId",
  rm.is_connected AS "isConnected",
  rm.joined_at AS "joinedAt",
  rm.left_at AS "leftAt"
`;

function mapMember(row) {
  return row && {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    socketId: row.socket_id,
    isConnected: row.is_connected,
    joinedAt: row.joined_at,
    leftAt: row.left_at,
  };
}

/** Inserts a connected room member and returns the membership row. */
async function addMember({ roomId, userId, socketId }) {
  const result = await pool.query(
    `
      INSERT INTO room_members (id, room_id, user_id, socket_id, is_connected)
      VALUES (gen_random_uuid(), $1, $2, $3, TRUE)
      RETURNING *
    `,
    [roomId, userId, socketId],
  );
  return mapMember(result.rows[0]);
}

/** Finds a user's membership in a room and returns it or null. */
async function findMember(roomId, userId) {
  const result = await pool.query(
    `
      SELECT id, room_id AS "roomId", user_id AS "userId", socket_id AS "socketId",
             is_connected AS "isConnected", joined_at AS "joinedAt", left_at AS "leftAt"
      FROM room_members
      WHERE room_id = $1 AND user_id = $2
      LIMIT 1
    `,
    [roomId, userId],
  );
  return result.rows[0] || null;
}

/** Marks a room member connected and clears the previous leave timestamp. */
async function markConnected(roomId, userId, socketId) {
  const result = await pool.query(
    `
      UPDATE room_members
      SET is_connected = TRUE, socket_id = $1, left_at = NULL
      WHERE room_id = $2 AND user_id = $3
      RETURNING *
    `,
    [socketId, roomId, userId],
  );
  return mapMember(result.rows[0]) || null;
}

/** Marks a room member disconnected and records the leave timestamp. */
async function markDisconnected(roomId, userId) {
  const result = await pool.query(
    `
      UPDATE room_members
      SET is_connected = FALSE, left_at = NOW()
      WHERE room_id = $1 AND user_id = $2
      RETURNING *
    `,
    [roomId, userId],
  );
  return mapMember(result.rows[0]) || null;
}

/** Returns all room members with usernames and camelCase membership fields. */
async function getMembersByRoom(roomId) {
  const result = await pool.query(
    `
      SELECT ${memberColumns}, u.username
      FROM room_members rm
      JOIN users u ON u.id = rm.user_id
      WHERE rm.room_id = $1
      ORDER BY rm.joined_at ASC
    `,
    [roomId],
  );
  return result.rows;
}

/** Counts connected members currently in a room. */
async function countConnectedMembers(roomId) {
  const result = await pool.query(
    `
      SELECT COUNT(*)::INTEGER AS count
      FROM room_members
      WHERE room_id = $1 AND is_connected = TRUE
    `,
    [roomId],
  );
  return result.rows[0].count;
}

module.exports = {
  addMember,
  findMember,
  markConnected,
  markDisconnected,
  getMembersByRoom,
  countConnectedMembers,
};
