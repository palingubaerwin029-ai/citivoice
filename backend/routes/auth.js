const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../db');
const auth    = require('../middleware/auth');
const { validateLogin, validateRegister } = require('../middleware/validate');

const JWT_SECRET = process.env.JWT_SECRET;

const sign = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

const safe = (user) => {
  const { password_hash, ...rest } = user;
  return rest;
};

// ─── Login (admin + mobile) ───────────────────────────────────────────────────
router.post('/login', validateLogin, async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user  = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = sign({ id: user.id, role: user.role });
    res.json({ token, user: safe(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Register (mobile citizens) ──────────────────────────────────────────────
router.post('/register', validateRegister, async (req, res) => {
  const { name, email, password, phone, barangay } = req.body;
  try {
    const [existingEmail] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail.length) return res.status(400).json({ error: 'Email already registered' });

    if (phone) {
      const [existingPhone] = await pool.query('SELECT id FROM users WHERE phone = ?', [phone]);
      if (existingPhone.length) return res.status(400).json({ error: 'Phone number already registered' });
    }

    // Password complexity check
    const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!complexityRegex.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and include uppercase, lowercase, numbers, and symbols.' });
    }

    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, phone, barangay, role, verification_status, is_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'citizen', 'unverified', 0, NOW(), NOW())`,
      [name, email, hash, phone || null, barangay || null]
    );
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    const token  = sign({ id: rows[0].id, role: rows[0].role });
    res.status(201).json({ token, user: safe(rows[0]) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Get current user from token ──────────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(safe(rows[0]));
  } catch (err) {
    console.error('Auth /me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
