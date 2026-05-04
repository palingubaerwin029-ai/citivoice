const router = require('express').Router();
const pool   = require('../db');
const auth   = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { sendEmail, sendSMS } = require('../services/notificationService');

// ─── List all announcements ───────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('Announcements list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Create announcement (admin only) ─────────────────────────────────────────
router.post('/', auth, requireRole('admin'), async (req, res) => {
  const { title, body, type, author, barangay, link } = req.body;
  if (!title?.trim() || !body?.trim())
    return res.status(400).json({ error: 'Title and body are required' });
  try {
    const [result] = await pool.query(
      `INSERT INTO announcements (title, body, type, author, barangay, link, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [title.trim(), body.trim(), type || 'info', author || null, barangay || 'All Barangays', link || null]
    );
    const [rows] = await pool.query('SELECT * FROM announcements WHERE id = ?', [result.insertId]);
    const announcement = rows[0];

    // ── Notify citizens via in-app, email & SMS ──────────────────────────────
    // Determine which citizens to notify (matching barangay or all)
    const targetBarangay = barangay && barangay !== 'All Barangays' ? barangay : null;
    let citizens;
    if (targetBarangay) {
      [citizens] = await pool.query(
        "SELECT id, name, email, phone FROM users WHERE role = 'citizen' AND barangay = ?",
        [targetBarangay]
      );
    } else {
      [citizens] = await pool.query(
        "SELECT id, name, email, phone FROM users WHERE role = 'citizen'"
      );
    }

    // Batch create in-app notifications
    if (citizens.length > 0) {
      const notifValues = citizens.map(c => [c.id, `📢 ${title.trim()}`, body.trim()]);
      await pool.query(
        'INSERT INTO notifications (user_id, title, message) VALUES ?',
        [notifValues]
      );

      // Fire email & SMS in background (don't block the response)
      setImmediate(async () => {
        for (const citizen of citizens) {
          try {
            if (citizen.email) {
              const htmlBody = `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f8; color: #333; max-width: 600px; margin: auto; border-radius: 8px;">
                  <h2 style="color: #1A6BFF;">📢 New Announcement</h2>
                  <p style="font-size: 16px; line-height: 1.5;">Hello ${citizen.name || 'Citizen'},</p>
                  <h3 style="color: #333;">${title.trim()}</h3>
                  <p style="font-size: 15px; line-height: 1.6;">${body.trim()}</p>
                  ${link ? `<p><a href="${link}" style="color: #1A6BFF;">Learn more →</a></p>` : ''}
                  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
                  <p style="font-size: 12px; color: #888;">This is an automated message from the CitiVoice Platform.</p>
                </div>`;
              await sendEmail(citizen.email, `CitiVoice: ${title.trim()}`, htmlBody);
            }
            if (citizen.phone) {
              await sendSMS(citizen.phone, `CitiVoice Announcement: ${title.trim()} — ${body.trim().substring(0, 140)}`);
            }
          } catch (err) {
            console.error(`Failed to notify citizen ${citizen.id}:`, err);
          }
        }
        console.log(`✅ Announcement notifications dispatched to ${citizens.length} citizen(s)`);
      });
    }

    res.status(201).json(announcement);
  } catch (err) {
    console.error('Announcement create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Update announcement (admin only) ─────────────────────────────────────────
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  const { title, body, type, author, barangay, link } = req.body;
  try {
    await pool.query(
      `UPDATE announcements SET
         title    = COALESCE(?, title),
         body     = COALESCE(?, body),
         type     = COALESCE(?, type),
         author   = COALESCE(?, author),
         barangay = COALESCE(?, barangay),
         link     = COALESCE(?, link),
         updated_at = NOW()
       WHERE id = ?`,
      [title, body, type, author, barangay, link, req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Announcement update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Delete announcement (admin only) ─────────────────────────────────────────
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Announcement delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
