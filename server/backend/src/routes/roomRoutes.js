const express = require('express');
const {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomState,
} = require('../controllers/roomController');

const roomRoutes = express.Router();

roomRoutes.post('/', createRoom);
roomRoutes.post('/:roomCode/join', joinRoom);
roomRoutes.post('/:roomId/leave', leaveRoom);
roomRoutes.get('/:roomId', getRoomState);

module.exports = { roomRoutes };
