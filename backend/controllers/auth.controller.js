const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { selectByEmail, selectByPhone, insertUser, selectById } = require('../models/user.model');

const JWT_SECRET = process.env.JWT_SECRET;

const sign = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

const safe = (user) => {
  const { password_hash, ...rest } = user;
  return rest;
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await selectByEmail(email);
    if (!user) return res.status(401).json({ error: 'auth/user-not-found' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'auth/wrong-password' });
    const token = sign({ id: user.id, role: user.role });
    res.json({ token, user: safe(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const register = async (req, res) => {
  const { name, email, password, phone, barangay, idType, idNumber, idImageUrl } = req.body;
  try {
    const existingEmail = await selectByEmail(email);
    if (existingEmail) return res.status(400).json({ error: 'Email already registered' });

    if (phone) {
      const existingPhone = await selectByPhone(phone);
      if (existingPhone)
        return res.status(400).json({ error: 'Phone number already registered' });
    }

    // Password complexity check
    const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!complexityRegex.test(password)) {
      return res.status(400).json({
        error:
          'Password must be at least 8 characters and include uppercase, lowercase, numbers, and symbols.',
      });
    }

    const hash = await bcrypt.hash(password, 12);
    const insertId = await insertUser(name, email, hash, phone, barangay, idType, idNumber, idImageUrl);
    const newUser = await selectById(insertId);
    const token = sign({ id: newUser.id, role: newUser.role });
    res.status(201).json({ token, user: safe(newUser) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await selectById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(safe(user));
  } catch (err) {
    console.error('Auth /me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  login,
  register,
  getMe,
};
