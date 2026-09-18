const { pool } = require('../config/db');

const spinColumns = `
	id,
	room_id AS "roomId",
	status,
	started_by AS "startedBy",
	started_at AS "startedAt",
	completed_at AS "completedAt",
	winner_id AS "winnerId"
`;

function mapSpin(row) {
	return row && {
		id: row.id,
		roomId: row.room_id,
		status: row.status,
		startedBy: row.started_by,
		startedAt: row.started_at,
		completedAt: row.completed_at,
		winnerId: row.winner_id,
	};
}

/** Inserts a running spin and lets unique-index errors bubble to the service. */
async function create({ roomId, startedBy }) {
	const result = await pool.query(
		`
			INSERT INTO spins (id, room_id, status, started_by, started_at)
			VALUES (gen_random_uuid(), $1, 'running', $2, NOW())
			RETURNING *
		`,
		[roomId, startedBy],
	);
	return mapSpin(result.rows[0]);
}

/** Finds the most recent spin for a room and returns it or null. */
async function findMostRecentByRoom(roomId) {
	const result = await pool.query(
		`
			SELECT ${spinColumns}
			FROM spins
			WHERE room_id = $1
			ORDER BY started_at DESC
			LIMIT 1
		`,
		[roomId],
	);
	return result.rows[0] || null;
}

/** Finds a spin by ID and returns the spin row or null. */
async function findById(spinId) {
	const result = await pool.query(
		`SELECT ${spinColumns} FROM spins WHERE id = $1 LIMIT 1`,
		[spinId],
	);
	return result.rows[0] || null;
}

/** Updates a spin status and optional completion fields, returning the updated row. */
async function updateStatus(spinId, status, extra = {}) {
	const setClauses = ['status = $1'];
	const values = [status];

	if (Object.prototype.hasOwnProperty.call(extra, 'completedAt')) {
		values.push(extra.completedAt);
		setClauses.push(`completed_at = $${values.length}`);
	}

	if (Object.prototype.hasOwnProperty.call(extra, 'winnerId')) {
		values.push(extra.winnerId);
		setClauses.push(`winner_id = $${values.length}`);
	}

	values.push(spinId);
	const result = await pool.query(
		`
			UPDATE spins
			SET ${setClauses.join(', ')}
			WHERE id = $${values.length}
			RETURNING *
		`,
		values,
	);
	return mapSpin(result.rows[0]) || null;
}

module.exports = { create, findMostRecentByRoom, findById, updateStatus };
