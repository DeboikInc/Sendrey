// routes/upload.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/special-instructions', upload.single('file'), async (req, res) => {
  try {
    const fileType = req.file.mimetype;
    const resourceType = fileType.startsWith('image/') ? 'image'
      : fileType.startsWith('audio/') ? 'video'  // Cloudinary uses 'video' for audio
        : 'raw';

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: resourceType, folder: 'sendrey-special-instructions' },
        (err, result) => err ? reject(err) : resolve(result)
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    res.json({ secure_url: result.secure_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/dispute-evidence', upload.array('evidence', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.json({ urls: [] });
    }

    const uploadPromises = req.files.map(async (file) => {
      const fileType = file.mimetype;
      const resourceType = fileType.startsWith('image/') ? 'image'
        : fileType.startsWith('audio/') ? 'video'
          : 'raw';

      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: resourceType, folder: 'sendrey-dispute-evidence' },
          (err, result) => err ? reject(err) : resolve(result.secure_url)
        );
        streamifier.createReadStream(file.buffer).pipe(stream);
      });
    });

    const urls = await Promise.all(uploadPromises);
    res.json({ urls });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;