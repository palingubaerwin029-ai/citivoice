const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const upload = require('../middleware/upload');
const { cacheMiddleware } = require('../middleware/cache');
const { validateConcern, validateIdParam } = require('../middleware/validate');
const {
  listConcerns,
  getMapConcerns,
  getConcern,
  createConcern,
  editConcern,
  removeConcern,
  toggleUpvote,
  uploadIdImage,
  generateAiResponse,
  getSimilarConcerns,
  linkConcerns,
  analyzeConcernDraft,
} = require('../controllers/concerns.controller');
const workflowController = require('../controllers/workflow.controller');

// ─── List all concerns (auth required, cached 60s) ────────────────────────────
router.get('/', auth, cacheMiddleware('concerns', 60), listConcerns);

// ─── Get map concerns (auth required, cached 60s) ─────────────────────────────
router.get('/map', auth, cacheMiddleware('map_concerns', 60), getMapConcerns);

// ─── Get single concern (auth required, cached 60s) ──────────────────────────
router.get('/:id', auth, validateIdParam, cacheMiddleware('concern_detail', 60), getConcern);

// ─── Submit new concern ───────────────────────────────────────────────────────
router.post('/', auth, upload.single('image'), validateConcern, createConcern);

// ─── AI Pre-submission Check ──────────────────────────────────────────────────
router.post('/analyze', auth, analyzeConcernDraft);

// ─── Update concern (admin only: status, admin_note) ──────────────────────────
router.put('/:id', auth, requireRole('admin'), upload.single('image'), validateIdParam, editConcern);

// ─── Delete concern (admin or owner) ──────────────────────────────────────────
router.delete('/:id', auth, validateIdParam, removeConcern);

// ─── Toggle upvote ────────────────────────────────────────────────────────────
router.post('/:id/upvote', auth, validateIdParam, toggleUpvote);

// ─── AI: Generate admin response draft ────────────────────────────────────────
router.post('/:id/ai-response', auth, requireRole('admin'), validateIdParam, generateAiResponse);

// ─── AI: Get similar/duplicate concerns ───────────────────────────────────────
router.get('/:id/similar', auth, requireRole('admin'), validateIdParam, getSimilarConcerns);

// ─── AI: Link two concerns as duplicate/related ──────────────────────────────
router.post('/:id/link', auth, requireRole('admin'), validateIdParam, linkConcerns);

// ─── Upload ID image (mobile verification) ────────────────────────────────────
router.post('/upload/id-image', upload.single('image'), uploadIdImage);

// ─── Workflow & SLA Tracking ──────────────────────────────────────────────────
router.get('/:id/assignments', auth, validateIdParam, workflowController.getAssignments);
router.post('/:id/assign', auth, requireRole('admin'), validateIdParam, workflowController.assignConcern);
router.get('/:id/comments', auth, validateIdParam, workflowController.getComments);
router.post('/:id/comments', auth, validateIdParam, workflowController.addComment);
router.get('/:id/audit', auth, requireRole('admin'), validateIdParam, workflowController.getAudit);

module.exports = router;
