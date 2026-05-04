const router = require('express').Router();
const pool   = require('../db');
const auth   = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { sendEmail, sendSMS } = require('../services/notificationService');

// ─── List all events ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM events ORDER BY date DESC');
    res.json(rows);
  } catch (err) {
    console.error('Events list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Create event (admin only) ────────────────────────────────────────────────
router.post('/', auth, requireRole('admin'), async (req, res) => {
  const { title, description, category, date, location, organizer, link } = req.body;
  if (!title?.trim() || !date)
    return res.status(400).json({ error: 'Title and date are required' });
  try {
    const [result] = await pool.query(
      `INSERT INTO events (title, description, category, date, location, organizer, link, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [title.trim(), description || null, category || 'other', new Date(date), location || null, organizer || null, link || null]
    );
    const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [result.insertId]);
    const event = rows[0];

    // ── Notify all citizens via in-app, email & SMS ──────────────────────────
    const [citizens] = await pool.query(
      "SELECT id, name, email, phone FROM users WHERE role = 'citizen'"
    );

    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const notifTitle = `📅 New Event: ${title.trim()}`;
    const notifMsg = `${title.trim()} on ${formattedDate}${location ? ` at ${location}` : ''}. ${description || ''}`.trim();

    // Batch create in-app notifications
    if (citizens.length > 0) {
      const notifValues = citizens.map(c => [c.id, notifTitle, notifMsg]);
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
                  <h2 style="color: #1A6BFF;">📅 New Event</h2>
                  <p style="font-size: 16px; line-height: 1.5;">Hello ${citizen.name || 'Citizen'},</p>
                  <h3 style="color: #333;">${title.trim()}</h3>
                  <p style="font-size: 15px;"><strong>📆 Date:</strong> ${formattedDate}</p>
                  ${location ? `<p style="font-size: 15px;"><strong>📍 Location:</strong> ${location}</p>` : ''}
                  ${organizer ? `<p style="font-size: 15px;"><strong>🏛️ Organizer:</strong> ${organizer}</p>` : ''}
                  ${description ? `<p style="font-size: 15px; line-height: 1.6;">${description}</p>` : ''}
                  ${link ? `<p><a href="${link}" style="color: #1A6BFF;">View details →</a></p>` : ''}
                  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
                  <p style="font-size: 12px; color: #888;">This is an automated message from the CitiVoice Platform.</p>
                </div>`;
              await sendEmail(citizen.email, `CitiVoice Event: ${title.trim()}`, htmlBody);
            }
            if (citizen.phone) {
              await sendSMS(citizen.phone, `CitiVoice Event: ${title.trim()} on ${formattedDate}${location ? ` at ${location}` : ''}`);
            }
          } catch (err) {
            console.error(`Failed to notify citizen ${citizen.id}:`, err);
          }
        }
        console.log(`✅ Event notifications dispatched to ${citizens.length} citizen(s)`);
      });
    }

    res.status(201).json(event);
  } catch (err) {
    console.error('Event create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Update event (admin only) ────────────────────────────────────────────────
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  const { title, description, category, date, location, organizer, link } = req.body;
  try {
    await pool.query(
      `UPDATE events SET
         title       = COALESCE(?, title),
         description = COALESCE(?, description),
         category    = COALESCE(?, category),
         date        = COALESCE(?, date),
         location    = COALESCE(?, location),
         organizer   = COALESCE(?, organizer),
         link        = COALESCE(?, link),
         updated_at  = NOW()
       WHERE id = ?`,
      [title, description, category, date ? new Date(date) : null, location, organizer, link, req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Event update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Delete event (admin only) ────────────────────────────────────────────────
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Event delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
