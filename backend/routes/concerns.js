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
  markConcernViewed,
  createConcern,
  editConcern,
  removeConcern,
  uploadIdImage,
  generateAiResponse,
  getSimilarConcerns,
  linkConcerns,
  analyzeConcernDraft,
  verifyConcernImage,
  getComments,
  addComment,
  getAudit,
} = require('../controllers/concerns.controller');

// ─── List all concerns (auth required, cached 60s) ────────────────────────────
router.get('/', auth, cacheMiddleware('concerns', 60), listConcerns);

// ─── Get concern statistics (auth required, live DB counts) ───────────────────
router.get('/stats', auth, getConcernStats);

// ─── Get map concerns (auth required, cached 60s) ─────────────────────────────
router.get('/map', auth, cacheMiddleware('map_concerns', 60), getMapConcerns);

// ─── Get single concern (auth required, cached 60s) ──────────────────────────
router.get('/:id', auth, validateIdParam, cacheMiddleware('concern_detail', 60), getConcern);

// ─── Mark concern as viewed by admin ──────────────────────────────────────────
router.post('/:id/view', auth, requireRole('admin'), validateIdParam, markConcernViewed);

// ─── Submit new concern (checks attached picture alignment with AI) ────────────
router.post('/', auth, upload.single('image'), validateConcern, createConcern);

// ─── AI Pre-submission Check (Text) ──────────────────────────────────────────
router.post('/analyze', auth, analyzeConcernDraft);

// ─── AI Pre-submission Check (Image alignment) ───────────────────────────────
router.post('/verify-image', auth, upload.single('image'), verifyConcernImage);

// ─── Update concern (admin: status, admin_note) ───────────────────────────────
router.put('/:id', auth, requireRole('admin'), upload.single('image'), validateIdParam, editConcern);

// ─── Delete concern (admin or owner) ──────────────────────────────────────────
router.delete('/:id', auth, validateIdParam, removeConcern);

// ─── AI: Generate admin response draft ────────────────────────────────────────
router.post('/:id/ai-response', auth, requireRole('admin'), validateIdParam, generateAiResponse);

// ─── AI: Get similar/duplicate concerns ───────────────────────────────────────
router.get('/:id/similar', auth, requireRole('admin'), validateIdParam, getSimilarConcerns);

// ─── AI: Link two concerns as duplicate/related ──────────────────────────────
router.post('/:id/link', auth, requireRole('admin'), validateIdParam, linkConcerns);

// ─── Upload ID image (mobile verification) ────────────────────────────────────
router.post('/upload/id-image', idUploadLimiter, upload.single('image'), uploadIdImage);

// ─── Comments: Citizen discussion & internal admin notes ─────────────────────
router.get('/:id/comments', auth, validateIdParam, getComments);
router.post('/:id/comments', auth, upload.single('image'), validateIdParam, addComment);

// ─── Audit Log ────────────────────────────────────────────────────────────────
router.get('/:id/audit', auth, requireRole('admin'), validateIdParam, getAudit);

// ─── Assignments stub (safely return empty list) ─────────────────────────────
router.get('/:id/assignments', auth, validateIdParam, (req, res) => res.json([]));
router.post('/:id/assign', auth, requireRole('admin'), validateIdParam, (req, res) => res.json({ success: true }));

module.exports = router;
