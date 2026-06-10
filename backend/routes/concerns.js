const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const upload = require('../middleware/upload');
const { cacheMiddleware } = require('../middleware/cache');
const { validateConcern, validateIdParam } = require('../middleware/validate');
const {
  listConcerns,
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

// ─── List all concerns (auth required, cached 60s) ────────────────────────────
router.get('/', auth, cacheMiddleware('concerns', 60), listConcerns);

// ─── Get single concern (auth required, cached 60s) ──────────────────────────
router.get('/:id', auth, validateIdParam, cacheMiddleware('concern_detail', 60), getConcern);

// ─── Submit new concern ───────────────────────────────────────────────────────
router.post('/', auth, upload.single('image'), validateConcern, createConcern);

// ─── AI Pre-submission Check ──────────────────────────────────────────────────
router.post('/analyze', auth, analyzeConcernDraft);

// ─── Update concern (admin only: status, admin_note) ──────────────────────────
router.put('/:id', auth, requireRole('admin'), validateIdParam, editConcern);

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

module.exports = router;
