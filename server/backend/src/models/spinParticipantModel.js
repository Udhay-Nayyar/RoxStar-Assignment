const { pool } = require('../config/db');

const participantColumns = `
  sp.id,
  sp.spin_id AS "spinId",
  sp.user_id AS "userId",
  sp.status,
  sp.eliminated_at AS "eliminatedAt",
  sp.elimination_order AS "eliminationOrder"
`;

/** Maps a database participant row to the model's camelCase shape. */
function mapParticipant(row) {
  return row && {
    id: row.id,
    spinId: row.spin_id,
    userId: row.user_id,
    status: row.status,
    eliminatedAt: row.eliminated_at,
    eliminationOrder: row.elimination_order,
  };
}

/** Inserts active participants for a spin in one query and returns all inserted rows. */
async function bulkInsertParticipants(spinId, userIds) {
  if (userIds.length === 0) return [];

  const values = [];
  const placeholders = userIds.map((userId, index) => {
    const spinIdPosition = index * 2 + 1;
    const userIdPosition = index * 2 + 2;
    values.push(spinId, userId);
    return `(gen_random_uuid(), $${spinIdPosition}, $${userIdPosition}, 'active')`;
  });

  const result = await pool.query(
    `
      INSERT INTO spin_participants (id, spin_id, user_id, status)
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `,
    values,
  );
  return result.rows.map(mapParticipant);
}

/** Returns all participants for a spin joined with their usernames. */
async function getParticipantsBySpin(spinId) {
  const result = await pool.query(
    `
      SELECT ${participantColumns}, u.username
      FROM spin_participants sp
      JOIN users u ON u.id = sp.user_id
      WHERE sp.spin_id = $1
      ORDER BY sp.elimination_order ASC NULLS LAST, sp.id ASC
    `,
    [spinId],
  );
  return result.rows;
}

/** Returns active participants for a spin joined with their usernames. */
async function getActiveParticipants(spinId) {
  const result = await pool.query(
    `
      SELECT ${participantColumns}, u.username
      FROM spin_participants sp
      JOIN users u ON u.id = sp.user_id
      WHERE sp.spin_id = $1 AND sp.status = 'active'
      ORDER BY sp.id ASC
    `,
    [spinId],
  );
  return result.rows;
}

/** Marks a spin participant eliminated with its timestamp and order. */
async function eliminateParticipant(spinId, userId, eliminationOrder) {
  const result = await pool.query(
    `
      UPDATE spin_participants
      SET status = 'eliminated', eliminated_at = NOW(), elimination_order = $1
      WHERE spin_id = $2 AND user_id = $3
      RETURNING *
    `,
    [eliminationOrder, spinId, userId],
  );
  return mapParticipant(result.rows[0]) || null;
}

/** Marks a spin participant as the winner and returns the updated row. */
async function setWinner(spinId, userId) {
  const result = await pool.query(
    `
      UPDATE spin_participants
      SET status = 'winner'
      WHERE spin_id = $1 AND user_id = $2
      RETURNING *
    `,
    [spinId, userId],
  );
  return mapParticipant(result.rows[0]) || null;
}

module.exports = {
  bulkInsertParticipants,
  getParticipantsBySpin,
  getActiveParticipants,
  eliminateParticipant,
  setWinner,
};
