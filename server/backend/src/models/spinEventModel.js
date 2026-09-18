const { pool } = require('../config/db');

const eventColumns = `
	id,
	spin_id AS "spinId",
	event_type AS "eventType",
	payload,
	created_at AS "createdAt"
`;

function mapEvent(row) {
	return row && {
		id: row.id,
		spinId: row.spin_id,
		eventType: row.event_type,
		payload: row.payload,
		createdAt: row.created_at,
	};
}

/** Logs a spin event with its JSON payload and returns the new event row. */
async function logEvent(spinId, eventType, payload) {
	const result = await pool.query(
		`
			INSERT INTO spin_events (id, spin_id, event_type, payload)
			VALUES (gen_random_uuid(), $1, $2, $3::jsonb)
			RETURNING *
		`,
		[spinId, eventType, JSON.stringify(payload)],
	);
	return mapEvent(result.rows[0]);
}

/** Returns all spin events ordered from oldest to newest. */
async function getEventsBySpin(spinId) {
	const result = await pool.query(
		`
			SELECT ${eventColumns}
			FROM spin_events
			WHERE spin_id = $1
			ORDER BY created_at ASC
		`,
		[spinId],
	);
	return result.rows;
}

module.exports = { logEvent, getEventsBySpin };
