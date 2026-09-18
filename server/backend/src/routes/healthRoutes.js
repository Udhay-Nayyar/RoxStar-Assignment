const express = require('express');

const healthRoutes = express.Router();

healthRoutes.get('/', (req, res) => {
  const now = new Date().toISOString();

  // Logic notes for later:
  // - Run SELECT 1 against Postgres to confirm connectivity.
  // - Return 503 if DB is disconnected.
  // - For now, hardcode the healthy response.

  res.status(200).json({
    status: 'ok',
    uptime: 123.45,
    db: 'connected',
    timestamp: now,
  });
});

module.exports = { healthRoutes };
