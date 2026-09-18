const { pool } = require('../config/db');

const roomColumns = `
	id,
	room_code AS "roomCode",
	owner_id AS "ownerId",
	status,
	created_at AS "createdAt"
`;

function mapRoom(row) {
	return row && {
		id: row.id,
		roomCode: row.room_code,
		ownerId: row.owner_id,
		status: row.status,
		createdAt: row.created_at,
	};
}

/** Inserts an open room and returns the newly created room row. */
async function create({ roomCode, ownerId }) {
	const result = await pool.query(
		`
			INSERT INTO rooms (id, room_code, owner_id, status)
			VALUES (gen_random_uuid(), $1, $2, 'open')
			RETURNING *
		`,
		[roomCode, ownerId],
	);
	return mapRoom(result.rows[0]);
}

/** Finds a room by code and returns the room row or null. */
async function findByCode(roomCode) {
	const result = await pool.query(
		`SELECT ${roomColumns} FROM rooms WHERE room_code = $1 LIMIT 1`,
		[roomCode],
	);
	return result.rows[0] || null;
}

/** Finds a room by ID and returns the room row or null. */
async function findById(roomId) {
	const result = await pool.query(
		`SELECT ${roomColumns} FROM rooms WHERE id = $1 LIMIT 1`,
		[roomId],
	);
	return result.rows[0] || null;
}

/** Updates a room status and returns the updated room row. */
async function updateStatus(roomId, status) {
	const result = await pool.query(
		`
			UPDATE rooms
			SET status = $1
			WHERE id = $2
			RETURNING *
		`,
		[status, roomId],
	);
	return mapRoom(result.rows[0]) || null;
}

module.exports = { create, findByCode, findById, updateStatus };
