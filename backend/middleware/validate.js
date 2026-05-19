const { body, param, validationResult } = require('express-validator');

// ─── Shared error handler ────────────────────────────────────────────────────
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: errors.array().map((e) => e.msg).join('; '),
      details: errors.array(),
    });
  }
  next();
};

// ─── :id param must be a positive integer ────────────────────────────────────
const validateIdParam = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID must be a positive integer')
    .toInt(),
  handleValidationErrors,
];

// ─── Auth: Login ─────────────────────────────────────────────────────────────
const validateLogin = [
  body('email')
    .trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

// ─── Auth: Register ──────────────────────────────────────────────────────────
const validateRegister = [
  body('name')
    .trim().notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters')
    .escape(),
  body('email')
    .trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^(\+?\d{10,15}|09\d{9})$/).withMessage('Invalid phone number format'),
  body('barangay')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 }).withMessage('Barangay must be under 100 characters'),
  handleValidationErrors,
];

// ─── Concerns: Submit ────────────────────────────────────────────────────────
const validateConcern = [
  body('title')
    .trim().notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 200 }).withMessage('Title must be 3–200 characters'),
  body('description')
    .trim().notEmpty().withMessage('Description is required')
    .isLength({ min: 10, max: 5000 }).withMessage('Description must be 10–5000 characters'),
  body('category')
    .trim().notEmpty().withMessage('Category is required'),
  body('priority')
    .optional({ values: 'falsy' })
    .isIn(['Low', 'Medium', 'High', 'Critical']).withMessage('Priority must be Low, Medium, High, or Critical'),
  body('location_lat')
    .optional({ values: 'falsy' })
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('location_lng')
    .optional({ values: 'falsy' })
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  handleValidationErrors,
];

// ─── Barangays ───────────────────────────────────────────────────────────────
const validateBarangay = [
  body('name')
    .trim().notEmpty().withMessage('Barangay name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
  handleValidationErrors,
];

// ─── Templates ───────────────────────────────────────────────────────────────
const validateTemplate = [
  body('category')
    .trim().notEmpty().withMessage('Category is required'),
  body('quick_title')
    .trim().notEmpty().withMessage('Quick title is required')
    .isLength({ max: 200 }).withMessage('Quick title must be under 200 characters'),
  body('template_body')
    .trim().notEmpty().withMessage('Template body is required')
    .isLength({ max: 5000 }).withMessage('Template body must be under 5000 characters'),
  body('priority')
    .optional({ values: 'falsy' })
    .isIn(['Low', 'Medium', 'High', 'Critical']).withMessage('Priority must be Low, Medium, High, or Critical'),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateIdParam,
  validateLogin,
  validateRegister,
  validateConcern,
  validateBarangay,
  validateTemplate,
};
