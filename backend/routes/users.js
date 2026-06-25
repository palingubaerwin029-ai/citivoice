const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { validateIdParam } = require('../middleware/validate');
const {
  listCitizens,
  getUser,
  updateUser,
  verifyUser,
  rejectUser,
  revokeUser,
  updateFcmToken,
  uploadAvatar,
} = require('../controllers/users.controller');
const upload = require('../middleware/upload');

// ─── List all non-admin users (admin only) ────────────────────────────────────
router.get('/', auth, requireRole('admin'), listCitizens);

// ─── Get single user (auth required, ownership or admin check) ────────────────
router.get('/:id', auth, validateIdParam, getUser);

// ─── Update user (auth required, ownership check) ─────────────────────────────
router.put('/:id', auth, validateIdParam, updateUser);

// ─── Verify user (admin only) ─────────────────────────────────────────────────
router.patch('/:id/verify', auth, requireRole('admin'), validateIdParam, verifyUser);

// ─── Reject user (admin only) ─────────────────────────────────────────────────
router.patch('/:id/reject', auth, requireRole('admin'), validateIdParam, rejectUser);

// ─── Revoke verification (admin only) ─────────────────────────────────────────
router.patch('/:id/revoke', auth, requireRole('admin'), validateIdParam, revokeUser);

// ─── Update FCM token (auth required, ownership check) ────────────────────────
router.put('/:id/fcm-token', auth, validateIdParam, updateFcmToken);

// ─── Upload profile avatar (auth required, ownership check) ───────────────────
router.post('/:id/avatar', auth, validateIdParam, upload.single('avatar'), uploadAvatar);

module.exports = router;
