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
  const allowed = /jpeg|jpg|png|gif|webp/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  if (extOk && mimeOk) cb(null, true);
  else cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
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
    const buffer = Buffer.alloc(4);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);

    const hex = buffer.toString('hex').toUpperCase();

    // Valid magic numbers for JPEG, PNG, GIF, WebP
    // JPEG: FFD8FF
    // PNG: 89504E47
    // GIF: 47494638
    // WebP: 52494646 (RIFF)
    const isValid =
      hex.startsWith('FFD8FF') ||
      hex.startsWith('89504E47') ||
      hex.startsWith('47494638') ||
      hex.startsWith('52494646');

    if (!isValid) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Invalid file signature. File may be corrupted or malicious.' });
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
