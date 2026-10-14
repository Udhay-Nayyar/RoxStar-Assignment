const express = require('express');
const { getSpinState } = require('../controllers/spinController');

const spinRoutes = express.Router();

// spinRoutes.post('/:roomId/spin/start', startSpin); // this end point is for starting the spin 
spinRoutes.get('/:roomId/spin', getSpinState); // this end point is for checking the state of the spin 

module.exports = { spinRoutes };
