/**
 * Role-based authorization middleware.
 * Must be used AFTER the `auth` middleware (which populates req.user).
 *
 * Usage:
 *   const requireRole = require('../middleware/requireRole');
 *   router.post('/', auth, requireRole('admin'), handler);
 */
module.exports =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
