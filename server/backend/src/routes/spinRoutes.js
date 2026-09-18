const express = require('express');
const { startSpin, getSpinState } = require('../controllers/spinController');

const spinRoutes = express.Router();

spinRoutes.post('/:roomId/spin/start', startSpin);
spinRoutes.get('/:roomId/spin', getSpinState);

module.exports = { spinRoutes };
