const express = require('express');
const { shareDraft } = require('../controllers/draftController');

const draftRoutes = express.Router();

draftRoutes.post('/:roomId/drafts/share', shareDraft);

module.exports = { draftRoutes };
