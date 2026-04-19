const router = require('express').Router();
const pool   = require('../db');
const auth   = require('../middleware/auth');
const { notifyUser } = require('../services/notificationService');

const safe = (user) => {
  const { password_hash, ...rest } = user;
  return rest;
};

// ─── List all non-admin users ─────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE role = 'citizen' ORDER BY created_at DESC"
    );
    res.json(rows.map(safe));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get single user ──────────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(safe(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Update user ──────────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  const { name, phone, barangay, id_type, id_number, id_image_url, verification_status, submitted_at } = req.body;
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
        verification_status = COALESCE(?, verification_status),
        submitted_at        = COALESCE(?, submitted_at),
        updated_at          = NOW()
       WHERE id = ?`,
      [name, phone, barangay, id_type, id_number, id_image_url, verification_status, submitted_at, req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    res.json(safe(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Verify user ──────────────────────────────────────────────────────────────
router.patch('/:id/verify', auth, async (req, res) => {
  try {
    await pool.query(
      `UPDATE users SET verification_status='verified', is_verified=1,
       verified_at=NOW(), rejection_reason=NULL, updated_at=NOW() WHERE id=?`,
      [req.params.id]
    );

    const [rows] = await pool.query('SELECT name, email, phone FROM users WHERE id = ?', [req.params.id]);
    if (rows.length) {
      notifyUser(rows[0], "Account Verified!", "Great news! Your CitiVoice account has been successfully verified. You can now log into the app.");
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Reject user ──────────────────────────────────────────────────────────────
router.patch('/:id/reject', auth, async (req, res) => {
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
      notifyUser(rows[0], "Account Verification Failed", `Unfortunately, your identity verification was rejected for the following reason:\n"${reason}"\nPlease log into the app to resubmit another ID.`);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Revoke verification ──────────────────────────────────────────────────────
router.patch('/:id/revoke', auth, async (req, res) => {
  try {
    await pool.query(
      `UPDATE users SET verification_status='unverified', is_verified=0,
       verified_at=NULL, rejection_reason=NULL, updated_at=NOW() WHERE id=?`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Update FCM token (no auth required, called on app launch) ────────────────
router.put('/:id/fcm-token', async (req, res) => {
  const { fcm_token } = req.body;
  try {
    await pool.query('UPDATE users SET fcm_token=?, updated_at=NOW() WHERE id=?', [fcm_token, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
