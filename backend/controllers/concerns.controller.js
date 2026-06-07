const fs = require('fs');
const path = require('path');
const { notifyUser } = require('../services/notificationService');
const { analyzeConcern } = require('../services/aiService');
const { analyzeImage } = require('../services/imageAnalyzer');
const { invalidate } = require('../middleware/cache');
const {
  selectAllConcerns,
  selectConcernById,
  checkUpvote,
  insertConcern,
  selectConcernWithUser,
  updateConcernFields,
  selectConcernImageUrl,
  deleteConcernAndUpvotes,
  removeUpvote,
  addUpvote,
  insertNotification
} = require('../models/concern.model');

const BASE_URL = () => process.env.BASE_URL || 'http://localhost:5000';

const deleteImageFile = (imageUrl) => {
  if (!imageUrl) return;
  try {
    const filename = imageUrl.split('/uploads/')[1];
    if (filename) {
      if (filename.includes('..')) return;
      const filePath = path.join(__dirname, '..', 'uploads', filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  } catch (_) { }
};

const listConcerns = async (req, res) => {
  try {
    const rows = await selectAllConcerns();
    if (req.user.role !== 'admin') {
      const sanitized = rows.map(r => {
        if (r.user_id === req.user.id) return r;
        const { user_id, user_name, user_barangay, ...rest } = r;
        return rest;
      });
      return res.json(sanitized);
    }
    res.json(rows);
  } catch (err) {
    console.error('Concerns list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getConcern = async (req, res) => {
  try {
    const concern = await selectConcernById(req.params.id);
    if (!concern) return res.status(404).json({ error: 'Concern not found' });

    concern.is_upvoted_by_me = await checkUpvote(concern.id, req.user.id);

    if (req.user.role !== 'admin' && concern.user_id !== req.user.id) {
      const { user_id, user_name, user_barangay, ...rest } = concern;
      return res.json(rest);
    }
    res.json(concern);
  } catch (err) {
    console.error('Concern fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createConcern = async (req, res) => {
  const {
    title, description, category, priority,
    location_address, location_lat, location_lng,
    user_name, user_barangay,
  } = req.body;

  const image_url = req.file ? `${BASE_URL()}/uploads/${req.file.filename}` : null;

  let finalCategory = category || 'Other';
  let finalPriority = priority || 'Medium';

  try {
    let imageTags = [];
    if (req.file) {
      const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
      imageTags = await analyzeImage(filePath);
    }

    const aiResult = analyzeConcern(`${title} ${description}`, imageTags);
    if (aiResult) {
      finalCategory = aiResult.category;
      finalPriority = aiResult.priority;
    }
  } catch (e) {
    console.error("AI Categorization Error:", e);
  }

  try {
    const insertId = await insertConcern({
      title, description, category: finalCategory, priority: finalPriority, image_url,
      location_address, location_lat, location_lng,
      user_id: req.user.id, user_name, user_barangay
    });
    invalidate('concerns', 'concern_detail');
    const newConcern = await selectConcernById(insertId);
    res.status(201).json(newConcern);
  } catch (err) {
    console.error('Concern submit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const editConcern = async (req, res) => {
  const { status, admin_note } = req.body;
  try {
    const concern = await selectConcernWithUser(req.params.id);
    if (!concern) return res.status(404).json({ error: 'Concern not found' });

    const fields = [];
    const values = [];
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (admin_note !== undefined) { fields.push('admin_note = ?'); values.push(admin_note || null); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    fields.push('updated_at = NOW()');
    values.push(req.params.id);

    await updateConcernFields(req.params.id, fields, values);

    if (concern.user_id) {
      if (status && status !== concern.status) {
        await insertNotification(concern.user_id, 'Concern Updated', `Your concern "${concern.title}" was updated to ${status}.`);
        notifyUser(concern, "Concern Updated", `Your concern "${concern.title}" has been updated to ${status}. Check the app for details.`);
      }
      if (admin_note) {
        await insertNotification(concern.user_id, 'New Official Response', `An admin replied to your concern: "${concern.title}".`);
        notifyUser(concern, "New Official Response", `An admin has officially responded to your concern: "${concern.title}". Check the app to view the update.`);
      }
    }

    invalidate('concerns', 'concern_detail');
    const updatedConcern = await selectConcernById(req.params.id);
    res.json(updatedConcern);
  } catch (err) {
    console.error('Concern update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const removeConcern = async (req, res) => {
  try {
    const concern = await selectConcernById(req.params.id);
    if (!concern) return res.status(404).json({ error: 'Concern not found' });

    if (req.user.role !== 'admin' && concern.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.user.role !== 'admin' && concern.status !== 'Pending') {
      return res.status(403).json({ error: 'Only pending concerns can be deleted' });
    }

    const imageUrl = concern.image_url;
    if (imageUrl) deleteImageFile(imageUrl);
    await deleteConcernAndUpvotes(req.params.id);
    invalidate('concerns', 'concern_detail');
    res.json({ success: true });
  } catch (err) {
    console.error('Concern delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const toggleUpvote = async (req, res) => {
  const { id: concernId } = req.params;
  const userId = req.user.id;
  try {
    const hasUpvoted = await checkUpvote(concernId, userId);
    if (hasUpvoted) {
      await removeUpvote(concernId, userId);
      invalidate('concerns', 'concern_detail');
      return res.json({ upvoted: false });
    }
    await addUpvote(concernId, userId);
    invalidate('concerns', 'concern_detail');
    res.json({ upvoted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const uploadIdImage = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  const url = `${BASE_URL()}/uploads/${req.file.filename}`;
  res.json({ url });
};

module.exports = {
  listConcerns,
  getConcern,
  createConcern,
  editConcern,
  removeConcern,
  toggleUpvote,
  uploadIdImage
};
