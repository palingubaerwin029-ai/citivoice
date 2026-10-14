const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const upload = require('../middleware/upload');
const { cacheMiddleware } = require('../middleware/cache');
const { validateConcern, validateIdParam } = require('../middleware/validate');

// Strict rate limiter for unauthenticated ID document upload to prevent disk DoS
const idUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 uploads per IP per 15 mins
  message: { error: 'Too many ID upload attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const {
  listConcerns,
  getMapConcerns,
  getConcernStats,
  getConcern,
  createConcern,
  editConcern,
  approveConcern,
  removeConcern,
  toggleUpvote,
  uploadIdImage,
  generateAiResponse,
  getSimilarConcerns,
  linkConcerns,
  analyzeConcernDraft,
  verifyConcernImage,
} = require('../controllers/concerns.controller');
const workflowController = require('../controllers/workflow.controller');

// ─── List all concerns (auth required, cached 60s) ────────────────────────────
router.get('/', auth, cacheMiddleware('concerns', 60), listConcerns);

// ─── Get concern statistics (auth required, live DB counts) ───────────────────
router.get('/stats', auth, getConcernStats);

// ─── Get map concerns (auth required, cached 60s) ─────────────────────────────
router.get('/map', auth, cacheMiddleware('map_concerns', 60), getMapConcerns);

// ─── Get single concern (auth required, cached 60s) ──────────────────────────
router.get('/:id', auth, validateIdParam, cacheMiddleware('concern_detail', 60), getConcern);

// ─── Submit new concern (checks attached picture alignment with AI) ────────────
router.post('/', auth, upload.single('image'), validateConcern, createConcern);

// ─── AI Pre-submission Check (Text) ──────────────────────────────────────────
router.post('/analyze', auth, analyzeConcernDraft);

// ─── AI Pre-submission Check (Image alignment) ───────────────────────────────
router.post('/verify-image', auth, upload.single('image'), verifyConcernImage);

// ─── Update concern (admin only: status, admin_note) ──────────────────────────
router.put('/:id', auth, requireRole('admin'), upload.single('image'), validateIdParam, editConcern);

// ─── Approve concern & email department (admin only) ─────────────────────────
router.post('/:id/approve', auth, requireRole('admin'), validateIdParam, approveConcern);

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
router.post('/upload/id-image', idUploadLimiter, upload.single('image'), uploadIdImage);

// ─── Workflow Tracking ────────────────────────────────────────────────────────
router.get('/:id/assignments', auth, validateIdParam, workflowController.getAssignments);
router.post('/:id/assign', auth, requireRole('admin'), validateIdParam, workflowController.assignConcern);
router.get('/:id/comments', auth, validateIdParam, workflowController.getComments);
router.post('/:id/comments', auth, validateIdParam, workflowController.addComment);
router.get('/:id/audit', auth, requireRole('admin'), validateIdParam, workflowController.getAudit);

module.exports = router;
