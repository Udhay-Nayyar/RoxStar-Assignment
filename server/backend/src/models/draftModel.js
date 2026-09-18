const { pool } = require('../config/db');

const draftColumns = `
	id,
	user_id AS "userId",
	room_id AS "roomId",
	file_url AS "fileUrl",
	duration_ms AS "durationMs",
	effect_used AS "effectUsed",
	created_at AS "createdAt"
`;

function mapDraft(row) {
	return row && {
		id: row.id,
		userId: row.user_id,
		roomId: row.room_id,
		fileUrl: row.file_url,
		durationMs: row.duration_ms,
		effectUsed: row.effect_used,
		createdAt: row.created_at,
	};
}

/** Inserts a draft and returns the newly created draft row. */
async function create({ userId, roomId, fileUrl, durationMs, effectUsed }) {
	const result = await pool.query(
		`
			INSERT INTO drafts (id, user_id, room_id, file_url, duration_ms, effect_used)
			VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
			RETURNING *
		`,
		[userId, roomId, fileUrl, durationMs, effectUsed],
	);
	return mapDraft(result.rows[0]);
}

/** Finds a draft by ID and returns the draft row or null. */
async function findById(draftId) {
	const result = await pool.query(
		`SELECT ${draftColumns} FROM drafts WHERE id = $1 LIMIT 1`,
		[draftId],
	);
	return result.rows[0] || null;
}

module.exports = { create, findById };
