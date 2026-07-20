const router = require('express').Router();
const { login, register, getMe, forgotPassword, resetPassword, verifyIdName } = require('../controllers/auth.controller');
const auth = require('../middleware/auth');
const {
  validateLogin,
  validateRegister,
  validateForgotPassword,
  validateResetPassword,
} = require('../middleware/validate');

// ─── Login (admin + mobile) ───────────────────────────────────────────────────
router.post('/login', validateLogin, login);

// ─── Register (mobile citizens) ──────────────────────────────────────────────
router.post('/register', validateRegister, register);

// ─── Verify ID Name (AI pre-registration check) ──────────────────────────────
router.post('/verify-id-name', verifyIdName);

// ─── Get current user from token ──────────────────────────────────────────────
router.get('/me', auth, getMe);

// ─── Forgot / Reset Password (public) ────────────────────────────────────────
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password', validateResetPassword, resetPassword);

module.exports = router;
