const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExts = /\.(jpe?g|png|gif|webp)$/i;
  const allowedMimes = /^image\/(jpe?g|png|gif|webp)$/i;
  const ext = path.extname(file.originalname).toLowerCase();
  const extOk = allowedExts.test(ext);
  const mimeOk = allowedMimes.test(file.mimetype) || file.mimetype === 'application/octet-stream' || !file.mimetype;

  if (extOk && mimeOk) {
    cb(null, true);
  } else {
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

    next();
  } catch (err) {
    console.error('Magic number check failed:', err);
    return res.status(500).json({ error: 'File verification failed' });
  }
};

module.exports = {
  single: (field) => [upload.single(field), verifyImageSignature],
};
