const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { cacheMiddleware } = require('../middleware/cache');
const { validateBarangay, validateIdParam } = require('../middleware/validate');
const {
  listBarangays,
  createBarangay,
  editBarangay,
  removeBarangay,
} = require('../controllers/barangays.controller');

// ─── List all barangays (cached 10 min) ───────────────────────────────────────
router.get('/', cacheMiddleware('barangays', 600), listBarangays);

// ─── Add barangay (admin only) ────────────────────────────────────────────────
router.post('/', auth, requireRole('admin'), validateBarangay, createBarangay);

// ─── Update barangay (admin only) ─────────────────────────────────────────────
router.put('/:id', auth, requireRole('admin'), validateIdParam, validateBarangay, editBarangay);

// ─── Delete barangay (admin only) ─────────────────────────────────────────────
router.delete('/:id', auth, requireRole('admin'), validateIdParam, removeBarangay);

module.exports = router;
