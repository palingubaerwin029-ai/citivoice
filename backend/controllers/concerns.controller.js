const fs = require('fs');
const path = require('path');
const { notifyUser } = require('../services/notificationService');
const { analyzeFullConcern, routeToDepartment } = require('../services/aiService');
const { analyzeImage } = require('../services/imageAnalyzer');
const { findSimilarConcerns } = require('../services/similarityService');
const { generateText, isAvailable: isGeminiAvailable } = require('../services/geminiService');
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
  insertNotification,
  insertConcernLink,
  selectLinkedConcerns
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

    // Attach linked/similar concerns for admin
    if (req.user.role === 'admin') {
      concern.linked_concerns = await selectLinkedConcerns(concern.id);
    }

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
  let sentiment = 'neutral';
  let urgencyScore = 50;

  try {
    let imageTags = [];
    if (req.file) {
      const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
      imageTags = await analyzeImage(filePath);
    }

    // New unified Gemini AI call
    const aiResult = await analyzeFullConcern(`${title} ${description}`, imageTags);
    if (aiResult) {
      finalCategory = aiResult.category || finalCategory;
      finalPriority = aiResult.priority || finalPriority;
      sentiment = aiResult.sentiment || sentiment;
      urgencyScore = aiResult.urgencyScore || urgencyScore;
    }
  } catch (e) {
    console.error("AI Categorization Error:", e);
  }

  // Auto-escalate priority if urgency is very high
  if (urgencyScore >= 85 && finalPriority !== 'High') {
    finalPriority = 'High';
    console.log(`[AI] Auto-escalated priority to High (urgency: ${urgencyScore})`);
  }

  // ─── Feature 4: Department Routing ──────────────────────────────────────
  let department = null;
  try {
    const routing = routeToDepartment(finalCategory, finalPriority);
    department = `${routing.department} — ${routing.team}`;
  } catch (e) {
    console.error("AI Routing Error:", e);
  }

  try {
    const insertId = await insertConcern({
      title, description, category: finalCategory, priority: finalPriority, image_url,
      location_address, location_lat, location_lng,
      user_id: req.user.id, user_name, user_barangay,
      sentiment, urgency_score: urgencyScore, department
    });
    invalidate('concerns', 'concern_detail');

    // ─── Feature 3: Duplicate Detection (async, non-blocking) ─────────────
    setImmediate(async () => {
      try {
        const allConcerns = await selectAllConcerns();
        const newConcern = await selectConcernById(insertId);
        if (!newConcern) return;

        const similar = findSimilarConcerns(newConcern, allConcerns);
        for (const match of similar) {
          await insertConcernLink(insertId, match.concern.id, match.matchType, match.combinedScore);
        }
        if (similar.length > 0) {
          console.log(`[AI] Found ${similar.length} similar concern(s) for #${insertId}`);
        }
      } catch (e) {
        console.error('[AI] Duplicate detection error:', e.message);
      }
    });

    const newConcern = await selectConcernById(insertId);
    res.status(201).json(newConcern);
  } catch (err) {
    console.error('Concern submit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const editConcern = async (req, res) => {
  const { status, admin_note, category, priority } = req.body;
  try {
    const concern = await selectConcernWithUser(req.params.id);
    if (!concern) return res.status(404).json({ error: 'Concern not found' });

    const fields = [];
    const values = [];
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (admin_note !== undefined) { fields.push('admin_note = ?'); values.push(admin_note || null); }
    if (category !== undefined) { fields.push('category = ?'); values.push(category); }
    if (priority !== undefined) { fields.push('priority = ?'); values.push(priority); }

    // Auto-update department when category or priority changes
    if (category !== undefined || priority !== undefined) {
      try {
        const existingConcern = await selectConcernById(req.params.id);
        const newCat = category || existingConcern.category;
        const newPri = priority || existingConcern.priority;
        const routing = routeToDepartment(newCat, newPri);
        fields.push('department = ?');
        values.push(`${routing.department} — ${routing.team}`);
      } catch (e) {
        console.error("AI Routing Error on edit:", e);
      }
    }

    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    fields.push('updated_at = NOW()');
    values.push(req.params.id);

    await updateConcernFields(req.params.id, fields, values);

    if (concern.user_id) {
      if (status && status !== concern.status) {
        await insertNotification(concern.user_id, 'Concern Updated', `Your concern "${concern.title}" was updated to ${status}.`);
        notifyUser(
          concern, 
          "Concern Updated", 
          `Your concern "${concern.title}" has been updated to ${status}. Check the app for details.`,
          `The citizen's concern titled "${concern.title}" just had its status changed to "${status}".`
        );
      }
      if (admin_note) {
        await insertNotification(concern.user_id, 'New Official Response', `An admin replied to your concern: "${concern.title}".`);
        notifyUser(
          concern, 
          "New Official Response", 
          `An admin has officially responded to your concern: "${concern.title}". Check the app to view the update.`,
          `An official city admin has just written a new response to the citizen's concern titled "${concern.title}". The response is: "${admin_note}"`
        );
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

// ─── Feature 1: AI-Generated Admin Response ─────────────────────────────────

const generateAiResponse = async (req, res) => {
  try {
    const concern = await selectConcernById(req.params.id);
    if (!concern) return res.status(404).json({ error: 'Concern not found' });

    // Try Gemini first
    if (isGeminiAvailable()) {
      const prompt = `You are a professional government administrator for Kabankalan City, Philippines (CitiVoice platform).
Write a concise, empathetic official response to this citizen concern. The response should:
- Acknowledge the issue
- Explain what action will be taken
- Provide a realistic timeline
- Thank the citizen for reporting

Concern Details:
- Title: ${concern.title}
- Description: ${concern.description}
- Category: ${concern.category}
- Priority: ${concern.priority}
- Status: ${concern.status}
- Barangay: ${concern.user_barangay || 'Not specified'}
- Location: ${concern.location_address || 'Not specified'}

Write 2-4 sentences maximum. Be professional but warm. Do not use markdown formatting.`;

      const aiResponse = await generateText(prompt, { temperature: 0.6, maxTokens: 300 });
      if (aiResponse) {
        return res.json({ response: aiResponse.trim(), source: 'gemini' });
      }
    }

    // Fallback: template-based response
    const templates = {
      'Road & Infrastructure': `Thank you for reporting this issue regarding ${concern.title.toLowerCase()}. Our City Engineering Office has been notified and a team will be dispatched to assess the situation. We expect to begin work within the next 3-5 business days. We appreciate your help in keeping our roads safe.`,
      'Electricity': `We have received your report about ${concern.title.toLowerCase()}. This has been forwarded to our electric utility team for immediate attention. A repair crew will be scheduled within 24-48 hours. Thank you for helping us maintain our community's infrastructure.`,
      'Water & Drainage': `Thank you for reporting this concern. The City Water District has been alerted about ${concern.title.toLowerCase()} and will send a team to inspect the area. Expected response time is within 2-3 business days. Your vigilance helps keep our community safe.`,
      'Waste & Sanitation': `We acknowledge your report regarding ${concern.title.toLowerCase()}. Our Sanitation Division has been notified and collection/cleanup will be prioritized. Please expect action within 1-3 business days. Thank you for helping maintain our community's cleanliness.`,
      'Public Safety': `Your safety report has been received and forwarded to the appropriate authorities. A patrol unit will be dispatched to assess the situation. For immediate emergencies, please also contact the local police station directly. Thank you for your vigilance.`,
      'Other': `Thank you for bringing ${concern.title.toLowerCase()} to our attention. This has been logged and assigned to the appropriate department for review. We will provide updates as the situation progresses. Your feedback helps improve our community.`,
    };

    const template = templates[concern.category] || templates['Other'];
    res.json({ response: template, source: 'template' });
  } catch (err) {
    console.error('AI Response generation error:', err);
    res.status(500).json({ error: 'Failed to generate response' });
  }
};

// ─── Feature 3: Get Similar Concerns ────────────────────────────────────────

const getSimilarConcerns = async (req, res) => {
  try {
    const concern = await selectConcernById(req.params.id);
    if (!concern) return res.status(404).json({ error: 'Concern not found' });

    // Get stored links
    const linked = await selectLinkedConcerns(concern.id);

    // Also compute live similarity if no stored links
    if (linked.length === 0) {
      const allConcerns = await selectAllConcerns();
      const similar = findSimilarConcerns(concern, allConcerns);
      return res.json({
        linked: [],
        computed: similar.map(s => ({
          id: s.concern.id,
          title: s.concern.title,
          status: s.concern.status,
          category: s.concern.category,
          priority: s.concern.priority,
          user_barangay: s.concern.user_barangay,
          created_at: s.concern.created_at,
          similarity_score: s.combinedScore,
          match_type: s.matchType,
        })),
      });
    }

    res.json({ linked, computed: [] });
  } catch (err) {
    console.error('Similar concerns error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── Feature 3: Link Two Concerns ──────────────────────────────────────────

const linkConcerns = async (req, res) => {
  const { target_id, link_type } = req.body;
  if (!target_id) return res.status(400).json({ error: 'target_id required' });

  try {
    await insertConcernLink(
      parseInt(req.params.id),
      parseInt(target_id),
      link_type || 'related',
      req.body.similarity_score || null
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Link concerns error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};





module.exports = {
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
};
