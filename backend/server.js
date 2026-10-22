require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const hpp = require('hpp');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const workflowService = require('./services/workflowService');
const backupService = require('./services/backupService');
const priorityService = require('./services/priorityService');
const pool = require('./db');
const compression = require('compression');

const app = express();
const server = http.createServer(app);

// ─── Gzip responses (JSON lists are large) ───────────────────────────────────
app.use(compression());

// ─── Security Headers (enhanced) ────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // CSP left to front-end meta tags
    referrerPolicy: { policy: 'same-origin' },
    frameguard: { action: 'deny' }, // prevent click-jacking
  }),
);

// ─── Request ID for traceability ─────────────────────────────────────────────
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// ─── HTTP Parameter Pollution protection ─────────────────────────────────────
app.use(hpp());

// ─── Rate Limiting ──────────────────────────────────────────────────────────
// Global limiter for all API routes
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 600,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs for auth routes
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

// ─── Slow Down ───────────────────────────────────────────────────────────────
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: (hits) => (hits - 50) * 500, // begin adding 500ms of delay per request above 50
  maxDelayMs: 5000, // max delay of 5 seconds
});

// ─── Ensure uploads directory exists ─────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ─── Middleware ───────────────────────────────────────────────────────────────
// CORS Configuration
const rawOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'];

const isWildcardOrigin = rawOrigins.includes('*');

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (isWildcardOrigin) return true;
  if (rawOrigins.includes(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    if (hostname.endsWith('.onrender.com') || hostname === 'onrender.com') return true;
    if (hostname.endsWith('.vercel.app') || hostname === 'vercel.app') return true;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  } catch (_) {}
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  }),
);

// ─── Socket.io Initialization ────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  },
});
app.set('io', io);

// Socket Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');

    const user = jwt.verify(token, JWT_SECRET);
    socket.user = user;
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id} (User: ${socket.user.id}, Role: ${socket.user.role})`);

  // Join rooms based on role
  socket.join(`user:${socket.user.id}`);
  if (socket.user.role === 'admin') {
    socket.join('admin');
    console.log(`[Socket] User ${socket.user.id} joined room: admin`);
  }
  if (socket.user.role === 'mayor' || socket.user.role === 'admin') {
    socket.join('mayor');
    console.log(`[Socket] User ${socket.user.id} joined room: mayor`);
  }

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Body Limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Static file serving for uploads (open CORS — public images) ─────────────
// Must be before the restrictive API cors() so browsers can load images cross-origin
const { getFileFromDb, initFileStorage } = require('./services/fileStorageService');
initFileStorage();

app.get('/uploads/:filename', cors({ origin: '*' }), async (req, res, next) => {
  const filename = path.basename(req.params.filename);
  const localPath = path.join(uploadsDir, filename);

  if (fs.existsSync(localPath)) {
    return res.sendFile(localPath);
  }

  // File not found on disk (e.g. after Render restart) — restore from persistent Aiven cloud DB
  try {
    const file = await getFileFromDb(filename);
    if (file && file.data) {
      try {
        fs.writeFileSync(localPath, file.data);
      } catch (_) {}
      res.setHeader('Content-Type', file.mimetype || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(file.data);
    }
  } catch (err) {
    console.error(`[FileStorage] Error restoring ${filename}:`, err);
  }

  return res.status(404).send('Image not found');
});

app.use('/uploads', cors({ origin: '*' }), express.static(uploadsDir));

// ─── Apply global rate limiter to all /api/ routes ───────────────────────────
app.use('/api', globalLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/concerns', require('./routes/concerns'));
app.use('/api/workflow', require('./routes/workflow'));
app.use('/api/barangays', require('./routes/barangays'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/backup', require('./routes/backup'));

// ─── Health check (verifies the database, not just the process) ──────────────
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'up', uptime: Math.round(process.uptime()), time: new Date() });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'down', time: new Date() });
  }
});

// ─── Unknown API routes ──────────────────────────────────────────────────────
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// ─── Global error handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[${req.id || '-'}] Global error:`, err.stack);
  const isMulterOrUploadError =
    err.name === 'MulterError' ||
    (err.message && err.message.toLowerCase().includes('only image files')) ||
    (err.message && err.message.toLowerCase().includes('file too large'));
  const status = err.status || err.statusCode || (isMulterOrUploadError ? 400 : 500);
  // Client errors (bad JSON, upload too large, etc.) keep their message; 5xx stays generic.
  res.status(status).json({ error: status < 500 ? err.message : 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ CitiVoice API & Socket running → http://localhost:${PORT}`);
  console.log(`📁 Uploads served at   → http://localhost:${PORT}/uploads`);

  priorityService.startScheduler();

  // ─── Start automatic database backup scheduler ───────────────────────────
  if (process.env.BACKUP_ENABLED !== 'false') {
    backupService.startScheduler();
  }
});

// ─── Graceful shutdown & crash visibility ────────────────────────────────────
const shutdown = (signal) => {
  console.log(`[Server] ${signal} received — shutting down gracefully...`);
  backupService.stopScheduler();
  priorityService.stopScheduler();
  io.close();
  server.close(async () => {
    try {
      await pool.end();
    } catch (_) { }
    process.exit(0);
  });
  // Force exit if connections refuse to close
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught exception:', err);
  shutdown('uncaughtException');
});

