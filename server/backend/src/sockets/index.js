const registerRoomHandlers = require('./roomSocket');
const registerSpinHandlers = require('./spinSocket');
// const roomMemberModel = require('../models/roomMemberModel'); // for disconnect cleanup

module.exports = function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Each file only knows about its own concern — room or spin
    registerRoomHandlers(io, socket);
    registerSpinHandlers(io, socket);

    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);

      const { roomId, userId } = socket.data;
      if (!roomId || !userId) return; // never joined a room, nothing to clean up

      // TODO: roomMemberModel.markDisconnected(roomId, userId)
      // TODO: io.to(roomId).emit('user_left', { userId, reason: 'disconnected' });
    });
  });
};