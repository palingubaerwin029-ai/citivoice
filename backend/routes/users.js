const router = require('express').Router();
const pool   = require('../db');
const auth   = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { notifyUser } = require('../services/notificationService');
const { validateIdParam } = require('../middleware/validate');

const safe = (user) => {
  const { password_hash, ...rest } = user;
  return rest;
};

// ─── List all non-admin users (admin only) ────────────────────────────────────
router.get('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE role = 'citizen' ORDER BY created_at DESC"
    );
    res.json(rows.map(safe));
  } catch (err) {
    console.error('Users list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Get single user (auth required, ownership or admin check) ────────────────
router.get('/:id', auth, validateIdParam, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(safe(rows[0]));
  } catch (err) {
    console.error('User fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Update user (auth required, ownership check) ─────────────────────────────
router.put('/:id', auth, validateIdParam, async (req, res) => {
  const { name, phone, barangay, id_type, id_number, id_image_url, submitted_at } = req.body;
  
  if (req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    if (id_number) {
      const [existingID] = await pool.query('SELECT id FROM users WHERE id_number = ? AND id != ?', [id_number, req.params.id]);
      if (existingID.length) return res.status(400).json({ error: 'This ID number is already linked to another account.' });
    }

    await pool.query(
      `UPDATE users SET
        name                = COALESCE(?, name),
        phone               = COALESCE(?, phone),
        barangay            = COALESCE(?, barangay),
        id_type             = COALESCE(?, id_type),
        id_number           = COALESCE(?, id_number),
        id_image_url        = COALESCE(?, id_image_url),
        submitted_at        = COALESCE(?, submitted_at),
        updated_at          = NOW()
       WHERE id = ?`,
      [name, phone, barangay, id_type, id_number, id_image_url, submitted_at, req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    res.json(safe(rows[0]));
  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Verify user (admin only) ─────────────────────────────────────────────────
router.patch('/:id/verify', auth, requireRole('admin'), validateIdParam, async (req, res) => {
  try {
    await pool.query(
      `UPDATE users SET verification_status='verified', is_verified=1,
       verified_at=NOW(), rejection_reason=NULL, updated_at=NOW() WHERE id=?`,
      [req.params.id]
    );

    const [rows] = await pool.query('SELECT name, email, phone FROM users WHERE id = ?', [req.params.id]);
    if (rows.length) {
      // In-app notification record
      await pool.query(
        'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
        [req.params.id, '✅ Account Verified!', 'Great news! Your CitiVoice account has been successfully verified. You can now log into the app.']
      );
      // Email & SMS
      notifyUser(rows[0], "Account Verified!", "Great news! Your CitiVoice account has been successfully verified. You can now log into the app.");
    }

    res.json({ success: true });
  } catch (err) {
    console.error('User verify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Reject user (admin only) ─────────────────────────────────────────────────
router.patch('/:id/reject', auth, requireRole('admin'), validateIdParam, async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'Rejection reason required' });
  try {
    await pool.query(
      `UPDATE users SET verification_status='rejected', is_verified=0,
       rejection_reason=?, verified_at=NULL, updated_at=NOW() WHERE id=?`,
      [reason, req.params.id]
    );

    const [rows] = await pool.query('SELECT name, email, phone FROM users WHERE id = ?', [req.params.id]);
    if (rows.length) {
      // In-app notification record
      await pool.query(
        'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
        [req.params.id, '❌ Verification Rejected', `Your identity verification was rejected. Reason: "${reason}". Please resubmit another ID.`]
      );
      // Email & SMS
      notifyUser(rows[0], "Account Verification Failed", `Unfortunately, your identity verification was rejected for the following reason:\n"${reason}"\nPlease log into the app to resubmit another ID.`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('User reject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Revoke verification (admin only) ─────────────────────────────────────────
router.patch('/:id/revoke', auth, requireRole('admin'), validateIdParam, async (req, res) => {
  try {
    await pool.query(
      `UPDATE users SET verification_status='unverified', is_verified=0,
       verified_at=NULL, rejection_reason=NULL, updated_at=NOW() WHERE id=?`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('User revoke error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Update FCM token (auth required, ownership check) ────────────────────────
router.put('/:id/fcm-token', auth, validateIdParam, async (req, res) => {
  const { fcm_token } = req.body;
  if (req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    await pool.query('UPDATE users SET fcm_token=?, updated_at=NOW() WHERE id=?', [fcm_token, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('FCM Token update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
