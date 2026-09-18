const { pool } = require('../config/db');

const userColumns = `
	id,
	username,
	device_id AS "deviceId",
	created_at AS "createdAt"
`;

/** Maps a database user row to the model's camelCase shape. */
function mapUser(row) {
	return row && {
		id: row.id,
		username: row.username,
		deviceId: row.device_id,
		createdAt: row.created_at,
	};
}

/** Finds a user by device ID and returns the user row or null. */
async function findByDeviceId(deviceId) {
	const result = await pool.query(
		`SELECT ${userColumns} FROM users WHERE device_id = $1 LIMIT 1`,
		[deviceId],
	);
	return result.rows[0] || null;
}

/** Inserts a user and returns the newly created user row. */
async function create({ username, deviceId }) {
	const result = await pool.query(
		`
			INSERT INTO users (id, username, device_id)
			VALUES (gen_random_uuid(), $1, $2)
			RETURNING *
		`,
		[username, deviceId],
	);
	return mapUser(result.rows[0]);
}

/** Finds a user by device ID or creates and returns one when absent. */
async function findOrCreate({ username, deviceId }) {
	const existingUser = await findByDeviceId(deviceId);
	return existingUser || create({ username, deviceId });
}

/** Finds a user by ID and returns the user row or null. */
async function findById(userId) {
	const result = await pool.query(
		`SELECT ${userColumns} FROM users WHERE id = $1 LIMIT 1`,
		[userId],
	);
	return result.rows[0] || null;
}

module.exports = { findByDeviceId, create, findOrCreate, findById };
