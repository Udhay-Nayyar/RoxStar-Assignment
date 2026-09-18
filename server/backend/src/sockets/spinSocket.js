const pool = require("../config/db");

module.exports = function registerSpinHandlers(io, socket) {

    // =========================================================
    // START SPIN
    // =========================================================

    socket.on("start_spin", async ({ roomId, userId }) => {

        const client = await pool.connect();

        try {

            if (!roomId || !userId) {
                socket.emit("spin_error", {
                    message: "roomId and userId are required"
                });
                return;
            }

            await client.query("BEGIN");


            // -------------------------------------------------
            // 1. CHECK ROOM
            // -------------------------------------------------

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

                socket.emit("spin_error", {
                    message: "Room does not exist"
                });

                return;
            }

            const room = roomResult.rows[0];


            // -------------------------------------------------
            // 2. CHECK OWNER
            // -------------------------------------------------

            if (room.owner_id !== userId) {

                await client.query("ROLLBACK");

                socket.emit("spin_error", {
                    message: "Caller is not the room owner"
                });

                return;
            }


            // -------------------------------------------------
            // 3. CHECK ROOM STATUS
            // -------------------------------------------------

            if (room.status !== "open") {

                await client.query("ROLLBACK");

                socket.emit("spin_error", {
                    message: "Room is not available for a new spin"
                });

                return;
            }


            // -------------------------------------------------
            // 4. GET CONNECTED MEMBERS
            // -------------------------------------------------

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


            // -------------------------------------------------
            // 5. CHECK PARTICIPANT COUNT
            // -------------------------------------------------

            if (members.length < 3) {

                await client.query("ROLLBACK");

                socket.emit("spin_error", {
                    message: "At least 3 connected members are required"
                });

                return;
            }

            if (members.length > 20) {

                await client.query("ROLLBACK");

                socket.emit("spin_error", {
                    message: "Maximum 20 participants are allowed"
                });

                return;
            }


            // -------------------------------------------------
            // 6. CREATE SPIN
            // -------------------------------------------------

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


            // -------------------------------------------------
            // 7. ADD PARTICIPANTS
            // -------------------------------------------------

            for (const member of members) {

                await client.query(
                    `INSERT INTO spin_participants
                        (spin_id, user_id, status)
                     VALUES
                        ($1, $2, 'active')`,
                    [
                        spin.id,
                        member.userId
                    ]
                );
            }


            // -------------------------------------------------
            // 8. CHANGE ROOM STATUS
            // -------------------------------------------------

            await client.query(
                `UPDATE rooms
                 SET status = 'in_spin'
                 WHERE id = $1`,
                [roomId]
            );


            // -------------------------------------------------
            // 9. SAVE SPIN EVENT
            // -------------------------------------------------

            await client.query(
                `INSERT INTO spin_events
                    (spin_id, event_type, payload)
                 VALUES
                    ($1, 'spin_started', $2)`,
                [
                    spin.id,
                    JSON.stringify({
                        roomId,
                        startedBy: userId,
                        participantCount: members.length
                    })
                ]
            );


            await client.query("COMMIT");


            // -------------------------------------------------
            // 10. SEND SPIN STARTED TO EVERYONE
            // -------------------------------------------------

            const spinData = {
                spinId: spin.id,
                roomId: spin.room_id,
                status: spin.status,
                startedAt: spin.started_at,
                eligibleParticipants: members
            };

            console.log("Spin started:", spinData);

            io.to(roomId).emit(
                "spin_started",
                spinData
            );


            // -------------------------------------------------
            // 11. START ELIMINATION PROCESS
            // -------------------------------------------------

            runElimination(
                io,
                roomId,
                spin.id
            );


        } catch (error) {

            await client.query("ROLLBACK");

            console.error(
                "Socket start spin error:",
                error
            );

            socket.emit("spin_error", {
                message: "Failed to start spin"
            });

        } finally {

            client.release();
        }
    });
};


// =============================================================
// ELIMINATION ENGINE
// =============================================================

async function runElimination(io, roomId, spinId) {

    console.log(
        `Elimination engine started for spin ${spinId}`
    );


    const interval = setInterval(async () => {

        try {

            // -------------------------------------------------
            // GET ACTIVE PARTICIPANTS
            // -------------------------------------------------

            const result = await pool.query(
                `SELECT
                    sp.id,
                    sp.user_id AS "userId",
                    u.username
                 FROM spin_participants sp
                 JOIN users u
                    ON u.id = sp.user_id
                 WHERE sp.spin_id = $1
                 AND sp.status = 'active'
                 ORDER BY sp.id`,
                [spinId]
            );

            const activeParticipants = result.rows;


            // -------------------------------------------------
            // SAFETY CHECK
            // -------------------------------------------------

            if (activeParticipants.length <= 1) {

                clearInterval(interval);

                if (activeParticipants.length === 1) {

                    await announceWinner(
                        io,
                        roomId,
                        spinId,
                        activeParticipants[0]
                    );
                }

                return;
            }


            // -------------------------------------------------
            // SELECT RANDOM PLAYER
            // -------------------------------------------------

            const randomIndex = Math.floor(
                Math.random() * activeParticipants.length
            );

            const eliminated =
                activeParticipants[randomIndex];


            // -------------------------------------------------
            // ELIMINATE PLAYER
            // -------------------------------------------------

            const eliminationResult = await pool.query(
                `UPDATE spin_participants
                 SET
                    status = 'eliminated',
                    elimination_order = (
                        SELECT COUNT(*)
                        FROM spin_participants
                        WHERE spin_id = $1
                        AND status = 'eliminated'
                    ) + 1
                 WHERE spin_id = $1
                 AND user_id = $2
                 AND status = 'active'
                 RETURNING
                    user_id AS "userId",
                    elimination_order AS "eliminationOrder"`,
                [
                    spinId,
                    eliminated.userId
                ]
            );


            // If somebody else already eliminated this user
            if (eliminationResult.rows.length === 0) {
                return;
            }


            const elimination =
                eliminationResult.rows[0];


            // -------------------------------------------------
            // SAVE EVENT
            // -------------------------------------------------

            await pool.query(
                `INSERT INTO spin_events
                    (spin_id, event_type, payload)
                 VALUES
                    ($1, 'user_eliminated', $2)`,
                [
                    spinId,
                    JSON.stringify({
                        userId: elimination.userId,
                        eliminationOrder:
                            elimination.eliminationOrder
                    })
                ]
            );


            // -------------------------------------------------
            // BROADCAST
            // -------------------------------------------------

            io.to(roomId).emit(
                "user_eliminated",
                {
                    spinId,
                    userId: elimination.userId,
                    eliminationOrder:
                        elimination.eliminationOrder
                }
            );


            console.log(
                "User eliminated:",
                elimination.userId
            );


        } catch (error) {

            console.error(
                "Elimination error:",
                error
            );

            clearInterval(interval);

        }

    }, 5000);
}


// =============================================================
// WINNER
// =============================================================

async function announceWinner(
    io,
    roomId,
    spinId,
    participant
) {

    try {

        // -----------------------------------------------------
        // MARK WINNER
        // -----------------------------------------------------

        await pool.query(
            `UPDATE spin_participants
             SET status = 'winner'
             WHERE spin_id = $1
             AND user_id = $2`,
            [
                spinId,
                participant.userId
            ]
        );


        // -----------------------------------------------------
        // COMPLETE SPIN
        // -----------------------------------------------------

        const spinResult = await pool.query(
            `UPDATE spins
             SET
                status = 'completed',
                winner_id = $2,
                completed_at = NOW()
             WHERE id = $1
             RETURNING
                id,
                winner_id,
                completed_at`,
            [
                spinId,
                participant.userId
            ]
        );


        // -----------------------------------------------------
        // ROOM BACK TO OPEN
        // -----------------------------------------------------

        await pool.query(
            `UPDATE rooms
             SET status = 'open'
             WHERE id = $1`,
            [roomId]
        );


        // -----------------------------------------------------
        // SAVE EVENT
        // -----------------------------------------------------

        await pool.query(
            `INSERT INTO spin_events
                (spin_id, event_type, payload)
             VALUES
                ($1, 'winner_announced', $2)`,
            [
                spinId,
                JSON.stringify({
                    winnerId: participant.userId
                })
            ]
        );


        const winnerData = {
            spinId,
            winnerId: participant.userId,
            username: participant.username,
            completedAt:
                spinResult.rows[0].completed_at
        };


        // -----------------------------------------------------
        // BROADCAST WINNER
        // -----------------------------------------------------

        io.to(roomId).emit(
            "winner_announced",
            winnerData
        );


        console.log(
            "🏆 Winner:",
            participant.username
        );


    } catch (error) {

        console.error(
            "Winner announcement error:",
            error
        );
    }
}