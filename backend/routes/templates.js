const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { cacheMiddleware } = require('../middleware/cache');
const { validateTemplate, validateIdParam } = require('../middleware/validate');
const {
  listTemplates,
  createTemplate,
  editTemplate,
  removeTemplate
} = require('../controllers/templates.controller');

router.get('/', auth, cacheMiddleware('templates', 600), listTemplates);

router.post('/', auth, requireRole('admin'), validateTemplate, createTemplate);

router.put('/:id', auth, requireRole('admin'), validateIdParam, editTemplate);

router.delete('/:id', auth, requireRole('admin'), validateIdParam, removeTemplate);

module.exports = router;
