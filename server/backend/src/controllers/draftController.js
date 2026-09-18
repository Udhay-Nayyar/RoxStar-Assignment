const pool = require("../config/db");


async function shareDraft(req, res) {
    const client = await pool.connect();

    try {
        const { roomId } = req.params;
        const { userId, fileUrl, durationMs, effectUsed } = req.body || {};

        // 1. Validate input
        if (!roomId || !userId || !fileUrl || !durationMs || !effectUsed) {
            return res.status(400).json({
                message: "roomId, userId, fileUrl, durationMs and effectUsed are required"
            });
        }

        // 2. Validate effect
        const validEffects = ["echo", "reverb", "pitch_shift"];

        if (!validEffects.includes(effectUsed)) {
            return res.status(400).json({
                message: "Invalid effectUsed value"
            });
        }

        // 3. Validate duration
        if (durationMs <= 0) {
            return res.status(400).json({
                message: "durationMs must be greater than 0"
            });
        }

        // Start transaction
        await client.query("BEGIN");

        // 4. Check whether room exists
        const roomResult = await client.query(
            `SELECT id
             FROM rooms
             WHERE id = $1`,
            [roomId]
        );

        if (roomResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Room does not exist"
            });
        }

        // 5. Check whether user exists
        const userResult = await client.query(
            `SELECT id
             FROM users
             WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "User does not exist"
            });
        }

        // 6. Check whether user belongs to room
        const memberResult = await client.query(
            `SELECT id
             FROM room_members
             WHERE room_id = $1
             AND user_id = $2`,
            [roomId, userId]
        );

        if (memberResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(403).json({
                message: "User is not a member of this room"
            });
        }

        // 7. Create draft
        const draftResult = await client.query(
            `INSERT INTO drafts
                (user_id, room_id, file_url, duration_ms, effect_used)
             VALUES
                ($1, $2, $3, $4, $5)
             RETURNING
                id,
                room_id,
                user_id,
                file_url,
                duration_ms,
                effect_used,
                created_at`,
            [
                userId,
                roomId,
                fileUrl,
                durationMs,
                effectUsed
            ]
        );

        const draft = draftResult.rows[0];

        // Everything successful
        await client.query("COMMIT");

        // 8. Return response
        return res.status(201).json({
            draftId: draft.id,
            roomId: draft.room_id,
            userId: draft.user_id,
            fileUrl: draft.file_url,
            durationMs: draft.duration_ms,
            effectUsed: draft.effect_used,
            sharedAt: draft.created_at
        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.error("Share draft error:", error);

        return res.status(500).json({
            message: "Failed to share draft"
        });

    } finally {

        client.release();
    }
}

module.exports = { shareDraft };
