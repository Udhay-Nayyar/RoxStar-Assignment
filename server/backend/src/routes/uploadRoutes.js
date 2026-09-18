const express = require('express');
const multer = require('multer');
const { uploadAudio } = require('../controllers/uploadController');

const uploadRoutes = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

uploadRoutes.post('/', upload.single('file'), uploadAudio);

module.exports = { uploadRoutes };