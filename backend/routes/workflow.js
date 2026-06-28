const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const workflowController = require('../controllers/workflow.controller');

// ─── Get Overdue SLA Assignments (Admin only) ─────────────────────────────────
router.get('/overdue', auth, requireRole('admin'), workflowController.getOverdueSLA);

module.exports = router;
