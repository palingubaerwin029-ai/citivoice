const router = require('express').Router();
const { login, register, getMe, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const auth = require('../middleware/auth');
const { validateLogin, validateRegister } = require('../middleware/validate');

// ─── Login (admin + mobile) ───────────────────────────────────────────────────
router.post('/login', validateLogin, login);

// ─── Register (mobile citizens) ──────────────────────────────────────────────
router.post('/register', validateRegister, register);

// ─── Get current user from token ──────────────────────────────────────────────
router.get('/me', auth, getMe);

// ─── Forgot / Reset Password (public) ────────────────────────────────────────
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
