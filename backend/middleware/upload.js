const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname || '').toLowerCase();
    if (!ext || ext === '' || ext === '.blob') {
      if (file.mimetype === 'image/png') ext = '.png';
      else if (file.mimetype === 'image/webp') ext = '.webp';
      else if (file.mimetype === 'image/gif') ext = '.gif';
      else ext = '.jpeg';
    }
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  console.log('[Upload] Incoming file in fileFilter:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
  });

  const allowedExts = /\.(jpe?g|png|gif|webp|heic|heif)$/i;
  const allowedMimes = /^image\/(jpe?g|png|gif|webp|heic|heif)$/i;
  const ext = path.extname(file.originalname || '').toLowerCase();

  // Android/Expo fetch(uri).blob() often sends text/plain or application/octet-stream.
  // As long as the extension is an allowed image extension OR the mime is an image mime (or empty/blob),
  // we accept it here and let verifyImageSignature strictly validate the genuine magic bytes on disk.
  const extOk = allowedExts.test(ext);
  const mimeOk =
    !file.mimetype ||
    file.mimetype === 'application/octet-stream' ||
    file.mimetype === 'text/plain' ||
    allowedMimes.test(file.mimetype) ||
    file.mimetype.startsWith('image/');

  const isBlobOrNoExt = !ext || ext === '' || ext === '.blob';

  if (extOk || isBlobOrNoExt || mimeOk) {
    cb(null, true);
  } else {
    console.warn(`[Upload] Rejected in fileFilter: ext=${ext}, mime=${file.mimetype}, originalname=${file.originalname}`);
    const err = new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed');
    err.status = 400;
    cb(err);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter,
});

const verifyImageSignature = (req, res, next) => {
  if (!req.file) return next();

  try {
    const filePath = req.file.path;
    const stat = fs.statSync(filePath);
    if (stat.size === 0) {
      console.error('[Upload] Empty 0-byte file received:', req.file.originalname);
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Uploaded file is empty or corrupted. Please try again.' });
    }

    const buffer = Buffer.alloc(Math.min(16, stat.size));
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);

    const hex = buffer.toString('hex').toUpperCase();

    // Valid magic numbers:
    // JPEG: FFD8 (0xFF 0xD8 - SOI)
    // PNG: 89504E47
    // GIF: 47494638
    // WebP: 52494646 (RIFF)
    // HEIC/HEIF: 66747970 (ftyp) in first 16 bytes
    const isValid =
      hex.startsWith('FFD8') ||
      hex.startsWith('89504E47') ||
      hex.startsWith('47494638') ||
      hex.startsWith('52494646') ||
      hex.includes('66747970');

    if (!isValid) {
      console.warn(`[Upload] Rejected invalid signature: ${hex} (${req.file.originalname}, ${stat.size} bytes)`);
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Invalid file signature. File may be corrupted or not a supported image.' });
    }

    // Ensure proper file extension on disk based on detected magic bytes
    let currentExt = path.extname(req.file.path).toLowerCase();
    if (!currentExt || currentExt === '' || currentExt === '.blob') {
      let correctExt = '.jpeg';
      if (hex.startsWith('89504E47')) correctExt = '.png';
      else if (hex.startsWith('47494638')) correctExt = '.gif';
      else if (hex.startsWith('52494646')) correctExt = '.webp';
      else if (hex.startsWith('FFD8')) correctExt = '.jpeg';

      const newPath = req.file.path + correctExt;
      fs.renameSync(req.file.path, newPath);
      req.file.path = newPath;
      req.file.filename = req.file.filename + correctExt;
    }

    // Automatically backup to persistent cloud database so it survives server restarts
    const { saveFileToDb } = require('../services/fileStorageService');
    saveFileToDb(req.file.filename, req.file.mimetype, req.file.path).catch(console.error);

    next();
  } catch (err) {
    console.error('Magic number check failed:', err);
    return res.status(500).json({ error: 'File verification failed' });
  }
};

module.exports = {
  single: (field) => [upload.single(field), verifyImageSignature],
};
