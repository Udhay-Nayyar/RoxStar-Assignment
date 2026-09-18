const express = require('express');
const cors = require('cors');
const { healthRoutes } = require('./routes/healthRoutes');
const { roomRoutes } = require('./routes/roomRoutes');
const { draftRoutes } = require('./routes/draftRoutes');
const { spinRoutes } = require('./routes/spinRoutes');
const { uploadRoutes } = require('./routes/uploadRoutes');
const { uploadDirectory } = require('./controllers/uploadController');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/health', healthRoutes);
app.use('/uploads', uploadRoutes);
app.use('/uploads', express.static(uploadDirectory));
app.use('/rooms', roomRoutes);
app.use('/rooms', draftRoutes);
app.use('/rooms', spinRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

module.exports = app;
