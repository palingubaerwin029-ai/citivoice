require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();

// ─── Security Headers (M2) ──────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ─── Rate Limiting (H4) ─────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs for auth routes
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

// ─── Ensure uploads directory exists ─────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ─── Middleware ───────────────────────────────────────────────────────────────
// CORS Configuration (H3)
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://localhost:5173']; // Common dev ports

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Body Limits (M1)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Static file serving for uploads (open CORS — public images) ─────────────
// Must be before the restrictive API cors() so browsers can load images cross-origin
app.use('/uploads', cors({ origin: '*' }), express.static(uploadsDir));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',          authLimiter, require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/concerns',      require('./routes/concerns'));
app.use('/api/barangays',     require('./routes/barangays'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/events',        require('./routes/events'));
app.use('/api/notifications', require('./routes/notifications'));

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ─── Global error handler (H5) ───────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  res.status(err.status || 500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ CitiVoice API running → http://localhost:${PORT}`);
  console.log(`📁 Uploads served at   → http://localhost:${PORT}/uploads`);
});
