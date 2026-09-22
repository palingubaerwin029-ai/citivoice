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

const app = express();
const server = http.createServer(app);

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
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
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
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173']; // Common dev ports

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// ─── Socket.io Initialization ────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
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
  if (socket.user.role === 'admin') {
    socket.join('admin');
    console.log(`[Socket] User ${socket.user.id} joined room: admin`);
  } else {
    socket.join(`user:${socket.user.id}`);
    console.log(`[Socket] User ${socket.user.id} joined room: user:${socket.user.id}`);
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
app.use('/uploads', cors({ origin: '*' }), express.static(uploadsDir));

// ─── Apply global rate limiter to all /api/ routes ───────────────────────────
app.use('/api', speedLimiter);
app.use('/api', globalLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/concerns', require('./routes/concerns'));
app.use('/api/workflow', require('./routes/workflow'));
app.use('/api/barangays', require('./routes/barangays'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/notifications', require('./routes/notifications'));

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ─── Global error handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[${req.id || '-'}] Global error:`, err.stack);
  res.status(err.status || 500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ CitiVoice API & Socket running → http://localhost:${PORT}`);
  console.log(`📁 Uploads served at   → http://localhost:${PORT}/uploads`);

  // Start SLA cron checker (every 15 minutes)
  setInterval(() => {
    workflowService.checkSLABreaches(app.get('io'));
  }, 15 * 60 * 1000);
});
