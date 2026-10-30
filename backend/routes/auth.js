const router = require('express').Router();
const {
  login,
  verifyAdmin2FA,
  resendAdmin2FA,
  googleLogin,
  sendRegistrationOtp,
  verifyRegistrationOtp,
  register,
  getMe,
  updateAdminProfile,
  forgotPassword,
  resetPassword,
  verifyIdName,
} = require('../controllers/auth.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const {
  validateLogin,
  validateRegister,
  validateForgotPassword,
  validateResetPassword,
} = require('../middleware/validate');

// ─── Login (admin + mobile) ───────────────────────────────────────────────────
router.post('/login', validateLogin, login);

// ─── Admin 2FA Email OTP Verification ─────────────────────────────────────────
router.post('/verify-admin-2fa', verifyAdmin2FA);
router.post('/resend-admin-2fa', resendAdmin2FA);

// ─── Google Sign-In (only for already-registered emails) ────────────────────────
router.post('/google', googleLogin);

// ─── Registration Email Verification (OTP) ───────────────────────────────────
router.post('/send-registration-otp', sendRegistrationOtp);
router.post('/verify-registration-otp', verifyRegistrationOtp);

// ─── Register (mobile citizens) ──────────────────────────────────────────────
router.post('/register', validateRegister, register);

// ─── Verify ID Name (AI pre-registration check) ──────────────────────────────
router.post('/verify-id-name', verifyIdName);

// ─── Get current user from token ──────────────────────────────────────────────
router.get('/me', auth, getMe);

// ─── Update Admin Account (Name, Email, Password) ────────────────────────────
router.put('/admin/account', auth, requireRole('admin'), updateAdminProfile);

// ─── Forgot / Reset Password (public) ────────────────────────────────────────
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password', validateResetPassword, resetPassword);

module.exports = router;
