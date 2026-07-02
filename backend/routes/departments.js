const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { cacheMiddleware, invalidate } = require('../middleware/cache');
const { validateIdParam } = require('../middleware/validate');
const departmentController = require('../controllers/department.controller');

// ─── List all departments (cached 10 min) ─────────────────────────────────────
router.get('/', cacheMiddleware('departments', 600), departmentController.listDepartments);

const invalidateDept = (req, res, next) => {
  invalidate('departments');
  next();
};

// ─── Add department (admin only) ──────────────────────────────────────────────
router.post('/', auth, requireRole('admin'), invalidateDept, departmentController.createDepartment);

// ─── Update department (admin only) ────────────────────────────────────────────
router.put('/:id', auth, requireRole('admin'), validateIdParam, invalidateDept, departmentController.editDepartment);

// ─── Delete department (admin only) ────────────────────────────────────────────
router.delete('/:id', auth, requireRole('admin'), validateIdParam, invalidateDept, departmentController.removeDepartment);

module.exports = router;
