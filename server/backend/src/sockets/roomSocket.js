const pool = require("../config/db");

module.exports = function registerRoomHandlers(io, socket) {

    // =========================================================
    // 1. JOIN ROOM
    // =========================================================

    socket.on("join_room", async ({ roomId, userId }) => {
        try {

            if (!roomId || !userId) {
                socket.emit("room_error", {
                    message: "roomId and userId are required"
                });
                return;
            }

            // Check room
            const roomResult = await pool.query(
                `SELECT
                    id,
                    room_code,
                    owner_id,
                    status
                 FROM rooms
                 WHERE id = $1`,
                [roomId]
            );

            if (roomResult.rows.length === 0) {
                socket.emit("room_error", {
                    message: "Room does not exist"
                });
                return;
            }

            // Check user
            const userResult = await pool.query(
                `SELECT id, username
                 FROM users
                 WHERE id = $1`,
                [userId]
            );

            if (userResult.rows.length === 0) {
                socket.emit("room_error", {
                    message: "User does not exist"
                });
                return;
            }

            // Check membership
            const memberResult = await pool.query(
                `SELECT id
                 FROM room_members
                 WHERE room_id = $1
                 AND user_id = $2`,
                [roomId, userId]
            );

            if (memberResult.rows.length === 0) {
                socket.emit("room_error", {
                    message: "User is not a member of this room"
                });
                return;
            }

            // Mark user connected in DB
            await pool.query(
                `UPDATE room_members
                 SET is_connected = true,
                     left_at = NULL
                 WHERE room_id = $1
                 AND user_id = $2`,
                [roomId, userId]
            );

            // Join Socket.IO internal room
            socket.join(roomId);

            // Store information on this socket
            socket.data.roomId = roomId;
            socket.data.userId = userId;

            // Get CURRENT room state from DB
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

            const room = roomResult.rows[0];

            const roomState = {
                roomId: room.id,
                roomCode: room.room_code,
                ownerId: room.owner_id,
                status: room.status,
                members: membersResult.rows
            };

            console.log("User joined room:", userId);

            // Send updated state to EVERYONE in the room
            io.to(roomId).emit("user_joined", {
                userId,
                roomState
            });

        } catch (error) {

            console.error("Socket join room error:", error);

            socket.emit("room_error", {
                message: "Failed to join room"
            });
        }
    });


    // =========================================================
    // 2. LEAVE ROOM
    // =========================================================

    socket.on("leave_room", async ({ roomId, userId }) => {
        try {

            if (!roomId || !userId) {
                socket.emit("room_error", {
                    message: "roomId and userId are required"
                });
                return;
            }

            // Update DB
            const result = await pool.query(
                `UPDATE room_members
                 SET is_connected = false,
                     left_at = NOW()
                 WHERE room_id = $1
                 AND user_id = $2
                 RETURNING room_id, user_id`,
                [roomId, userId]
            );

            if (result.rows.length === 0) {
                socket.emit("room_error", {
                    message: "User is not a member of this room"
                });
                return;
            }

            // Leave Socket.IO room
            socket.leave(roomId);

            // Clear socket data
            socket.data.roomId = null;
            socket.data.userId = null;

            // Get updated room state
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

            const roomResult = await pool.query(
                `SELECT
                    id,
                    room_code,
                    owner_id,
                    status
                 FROM rooms
                 WHERE id = $1`,
                [roomId]
            );

            const room = roomResult.rows[0];

            const roomState = {
                roomId: room.id,
                roomCode: room.room_code,
                ownerId: room.owner_id,
                status: room.status,
                members: membersResult.rows
            };

            console.log("User left room:", userId);

            // Tell remaining users
            io.to(roomId).emit("user_left", {
                userId,
                roomState
            });

        } catch (error) {

            console.error("Socket leave room error:", error);

            socket.emit("room_error", {
                message: "Failed to leave room"
            });
        }
    });


    // =========================================================
    // 3. SHARE DRAFT
    // =========================================================

    socket.on("share_draft", async ({
        roomId,
        userId,
        fileUrl,
        durationMs,
        effectUsed
    }) => {

        try {

            if (
                !roomId ||
                !userId ||
                !fileUrl ||
                !durationMs ||
                !effectUsed
            ) {
                socket.emit("room_error", {
                    message:
                        "roomId, userId, fileUrl, durationMs and effectUsed are required"
                });
                return;
            }

            const validEffects = [
                "echo",
                "reverb",
                "pitch_shift"
            ];

            if (!validEffects.includes(effectUsed)) {
                socket.emit("room_error", {
                    message: "Invalid effectUsed value"
                });
                return;
            }

            // Check membership
            const memberResult = await pool.query(
                `SELECT id
                 FROM room_members
                 WHERE room_id = $1
                 AND user_id = $2`,
                [roomId, userId]
            );

            if (memberResult.rows.length === 0) {
                socket.emit("room_error", {
                    message: "User is not a member of this room"
                });
                return;
            }

            // Save draft
            const draftResult = await pool.query(
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

            const draftData = {
                draftId: draft.id,
                roomId: draft.room_id,
                userId: draft.user_id,
                fileUrl: draft.file_url,
                durationMs: draft.duration_ms,
                effectUsed: draft.effect_used,
                sharedAt: draft.created_at
            };

            console.log("Draft shared:", draftData);

            // Send to everyone in room
            io.to(roomId).emit("draft_shared", {
                draft: draftData
            });

        } catch (error) {

            console.error("Socket share draft error:", error);

            socket.emit("room_error", {
                message: "Failed to share draft"
            });
        }
    });


    // =========================================================
    // 4. REQUEST CURRENT ROOM STATE
    // =========================================================

    socket.on("request_room_state", async ({ roomId }) => {

        try {

            if (!roomId) {
                socket.emit("room_error", {
                    message: "roomId is required"
                });
                return;
            }

            // Get room
            const roomResult = await pool.query(
                `SELECT
                    id,
                    room_code,
                    owner_id,
                    status
                 FROM rooms
                 WHERE id = $1`,
                [roomId]
            );

            if (roomResult.rows.length === 0) {
                socket.emit("room_error", {
                    message: "Room does not exist"
                });
                return;
            }

            const room = roomResult.rows[0];

            // Get members
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

            // Get active spin
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

            const roomState = {
                roomId: room.id,
                roomCode: room.room_code,
                ownerId: room.owner_id,
                status: room.status,
                members: membersResult.rows,
                activeSpin
            };

            console.log("Sending current room state");

            // ONLY the requesting socket receives this
            socket.emit("room_state", roomState);

        } catch (error) {

            console.error(
                "Socket request room state error:",
                error
            );

            socket.emit("room_error", {
                message: "Failed to get room state"
            });
        }
    });

};