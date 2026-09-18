const { io } = require('socket.io-client');
const server = require('./server');

const ROOM_ID = 'ABC123';
const OWNER_ID = 'USER123';
const GUEST_ID = 'USER456';
const TIMEOUT_MS = 3000;

function waitForEvent(socket, eventName, description) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off(eventName, handleEvent);
            reject(new Error(`Timed out waiting for ${description || eventName}`));
        }, TIMEOUT_MS);

        function handleEvent(payload) {
            clearTimeout(timer);
            resolve(payload);
        }

        socket.once(eventName, handleEvent);
    });
}

function connectSocket(url, name) {
    return new Promise((resolve, reject) => {
        const socket = io(url, {
            transports: ['websocket'],
            reconnection: false,
        });

        const timer = setTimeout(() => {
            socket.close();
            reject(new Error(`${name} connection timed out`));
        }, TIMEOUT_MS);

        socket.once('connect', () => {
            clearTimeout(timer);
            resolve(socket);
        });

        socket.once('connect_error', (error) => {
            clearTimeout(timer);
            socket.close();
            reject(new Error(`${name} connection failed: ${error.message}`));
        });
    });
}

async function runSocketTest() {
    const sockets = [];
    let listeningServer;

    try {
        listeningServer = await new Promise((resolve, reject) => {
            const onError = (error) => reject(error);
            server.once('error', onError);
            server.listen(0, () => {
                server.off('error', onError);
                resolve(server);
            });
        });

        const { port } = listeningServer.address();
        const baseUrl = `http://127.0.0.1:${port}`;
        const owner = await connectSocket(baseUrl, 'owner');
        const guest = await connectSocket(baseUrl, 'guest');
        sockets.push(owner, guest);

        owner.emit('join_room', { roomId: ROOM_ID, userId: OWNER_ID });
        const ownerJoined = await waitForEvent(owner, 'user_joined', 'owner user_joined');
        assert(ownerJoined.userId === OWNER_ID, 'owner user_joined payload');
        assert(ownerJoined.roomState.roomId === ROOM_ID, 'owner room state');

        const guestJoinEvent = waitForEvent(owner, 'user_joined', 'guest user_joined');
        guest.emit('join_room', { roomId: ROOM_ID, userId: GUEST_ID });
        const guestJoined = await guestJoinEvent;
        assert(guestJoined.userId === GUEST_ID, 'guest user_joined payload');

        const roomStateEvent = waitForEvent(owner, 'room_state', 'room_state');
        owner.emit('request_room_state', { roomId: ROOM_ID });
        const roomState = await roomStateEvent;
        assert(roomState.roomId === ROOM_ID, 'room_state room ID');
        assert(roomState.status === 'open', 'room_state status');

        const draftEvent = waitForEvent(guest, 'draft_shared', 'draft_shared');
        owner.emit('share_draft', {
            roomId: ROOM_ID,
            draft: {
                draftId: 'DRAFT123',
                userId: OWNER_ID,
                fileUrl: 'local/test.m4a',
            },
        });
        const sharedDraft = await draftEvent;
        assert(sharedDraft.draft.draftId === 'DRAFT123', 'draft_shared payload');

        const spinEvent = waitForEvent(guest, 'spin_started', 'spin_started');
        owner.emit('start_spin', { roomId: ROOM_ID, userId: OWNER_ID });
        const spin = await spinEvent;
        assert(spin.status === 'running', 'spin_started status');
        assert(spin.spinId, 'spin_started spin ID');

        const leftEvent = waitForEvent(owner, 'user_left', 'user_left');
        guest.emit('leave_room', { roomId: ROOM_ID, userId: GUEST_ID });
        const left = await leftEvent;
        assert(left.userId === GUEST_ID, 'user_left payload');

        console.log('Socket test passed: connect, join, state, draft, spin, and leave events.');
        console.log('Pending events not emitted by the current server: user_eliminated, winner_announced.');
    } finally {
        sockets.forEach((socket) => socket.close());

        if (listeningServer && listeningServer.listening) {
            await new Promise((resolve) => listeningServer.close(resolve));
        }
    }
}

function assert(condition, label) {
    if (!condition) {
        throw new Error(`Assertion failed: ${label}`);
    }
}

if (require.main === module) {
    runSocketTest().catch((error) => {
        console.error(`Socket test failed: ${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = { runSocketTest };