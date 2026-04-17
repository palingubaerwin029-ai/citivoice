require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// ─── Ensure uploads directory exists ─────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static file serving for uploads ─────────────────────────────────────────
app.use('/uploads', express.static(uploadsDir));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/concerns',      require('./routes/concerns'));
app.use('/api/barangays',     require('./routes/barangays'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/events',        require('./routes/events'));

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ─── Global error handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ CitiVoice API running → http://localhost:${PORT}`);
  console.log(`📁 Uploads served at   → http://localhost:${PORT}/uploads`);
});
