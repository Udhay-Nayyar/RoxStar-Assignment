const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const uploadDirectory = path.resolve(__dirname, '../../../uploads');

function uploadAudio(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'An audio file is required' });
  }

  fs.mkdirSync(uploadDirectory, { recursive: true });
  const extension = path.extname(req.file.originalname) || '.audio';
  const filename = `${crypto.randomUUID()}${extension}`;
  fs.writeFileSync(path.join(uploadDirectory, filename), req.file.buffer);

  const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
  return res.status(201).json({ url: `${baseUrl}/uploads/${filename}` });
}

module.exports = { uploadAudio, uploadDirectory };