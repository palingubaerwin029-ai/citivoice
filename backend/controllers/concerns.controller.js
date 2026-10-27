const fs = require('fs');
const path = require('path');
const { notifyUser, dispatchSystemNotification } = require('../services/notificationService');
const { analyzeFullConcern, verifyImageAlignment, routeToDepartment, NOT_TYPICAL_CATEGORY, raisePriority } = require('../services/aiService');
const { analyzeImage } = require('../services/imageAnalyzer');
const { findSimilarConcerns } = require('../services/similarityService');
const { generateText, isAvailable: isGeminiAvailable } = require('../services/groqService');
const { cacheMiddleware, invalidate } = require('../middleware/cache');
const { validateConcern, validateIdParam } = require('../middleware/validate');
const {
  selectAllConcerns,
  countConcerns,
  selectConcernStats,
  selectMapConcerns,
  selectConcernById,
  insertConcern,
  selectConcernWithUser,
  updateConcernFields,
  selectConcernImageUrl,
  deleteConcern,
  insertNotification,
  insertConcernLink,
  selectLinkedConcerns,
} = require('../models/concern.model');

const resolveDepartment = (category, priority) => {
  try {
    const routing = routeToDepartment(category, priority);
    return routing ? `${routing.department} — ${routing.team}` : 'General Municipal Services';
  } catch (_) {
    return 'General Municipal Services';
  }
};

const logAudit = async (entityType, entityId, action, changedBy, changedByName, oldValue, newValue) => {
  try {
    const pool = require('../db');
    await pool.query(
      `INSERT INTO audit_log (entity_type, entity_id, action, changed_by, changed_by_name, old_value, new_value)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        entityType,
        entityId,
        action,
        changedBy || null,
        changedByName || null,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
      ]
    );
  } catch (err) {
    console.error('[Audit Log] Failed to write audit record:', err.message);
  }
};

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
  } catch (_) {}
};

const cleanOfficialResponse = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\[(?:Auto-)?Duplicate(?: concern)? of [^\]]+\]\s*/gi, '').trim();
};

const listConcerns = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const { status, category, userId, barangay, search } = req.query;

    const [rows, total] = await Promise.all([
      selectAllConcerns(limit, offset, userId, status, category, barangay, search),
      countConcerns(userId, status, category, barangay, search)
    ]);

    const data = rows.map((r) => {
      const cleanR = {
        ...r,
        admin_note: cleanOfficialResponse(r.admin_note),
      };
      if (req.user.role !== 'admin') {
        if (cleanR.user_id === req.user.id) return cleanR;
        const { user_id, user_name, user_barangay, ...rest } = cleanR;
        return rest;
      }
      return cleanR;
    });

    res.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Concerns list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getMapConcerns = async (req, res) => {
  try {
    const rows = await selectMapConcerns();
    res.json(rows);
  } catch (err) {
    console.error('Map concerns error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getConcernStats = async (req, res) => {
  try {
    const targetUserId = req.query.userId ? parseInt(req.query.userId, 10) : (req.user?.role === 'citizen' ? req.user.id : null);
    const [city, mine] = await Promise.all([
      selectConcernStats(null),
      targetUserId ? selectConcernStats(targetUserId) : (req.user?.id ? selectConcernStats(req.user.id) : null),
    ]);

    res.json({
      city,
      mine: mine || { total: 0, pending: 0, inProgress: 0, resolved: 0, rejected: 0, urgent: 0 },
      ...city,
    });
  } catch (err) {
    console.error('getConcernStats error:', err);
    res.status(500).json({ error: 'Failed to fetch concern statistics' });
  }
};

const getConcern = async (req, res) => {
  try {
    const concern = await selectConcernById(req.params.id);
    if (!concern) return res.status(404).json({ error: 'Concern not found' });

    // When viewed by admin, record admin_viewed_at timestamp if not already set
    if (req.user?.role === 'admin' && !concern.admin_viewed_at) {
      const now = new Date();
      try {
        const pool = require('../db');
        try {
          await pool.query('UPDATE concerns SET admin_viewed_at = ? WHERE id = ?', [now, concern.id]);
        } catch (colErr) {
          if (colErr.code === 'ER_BAD_FIELD_ERROR' || colErr.errno === 1054) {
            await pool.query('ALTER TABLE concerns ADD COLUMN admin_viewed_at DATETIME DEFAULT NULL AFTER admin_note');
            await pool.query('UPDATE concerns SET admin_viewed_at = ? WHERE id = ?', [now, concern.id]);
          } else {
            throw colErr;
          }
        }
        concern.admin_viewed_at = now;
        invalidate('concerns', 'concern_detail', 'map_concerns');

        const io = req.app?.get('io');
        if (io) {
          io.to('admin').emit('concern_updated', { id: concern.id, admin_viewed_at: now });
          io.emit('concern_updated', { id: concern.id, admin_viewed_at: now });
          if (concern.user_id) {
            io.to(`user:${concern.user_id}`).emit('concern_viewed', { concernId: concern.id, admin_viewed_at: now });
            io.to(`user:${concern.user_id}`).emit('concern_updated', { id: concern.id, admin_viewed_at: now });
          }
        }
      } catch (viewErr) {
        console.error('Failed to update admin_viewed_at on getConcern:', viewErr);
      }
    }

    // Attach linked/similar concerns for admin
    if (req.user.role === 'admin') {
      concern.linked_concerns = await selectLinkedConcerns(concern.id);
    }

    if (concern.admin_note) {
      concern.admin_note = cleanOfficialResponse(concern.admin_note);
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

const markConcernViewed = async (req, res) => {
  try {
    const concernId = req.params.id;
    const pool = require('../db');
    let rows;
    try {
      [rows] = await pool.query('SELECT id, user_id, admin_viewed_at FROM concerns WHERE id = ?', [concernId]);
    } catch (colErr) {
      if (colErr.code === 'ER_BAD_FIELD_ERROR' || colErr.errno === 1054) {
        await pool.query('ALTER TABLE concerns ADD COLUMN admin_viewed_at DATETIME DEFAULT NULL AFTER admin_note');
        [rows] = await pool.query('SELECT id, user_id, admin_viewed_at FROM concerns WHERE id = ?', [concernId]);
      } else {
        throw colErr;
      }
    }
    if (rows.length === 0) return res.status(404).json({ error: 'Concern not found' });

    let viewedAt = rows[0].admin_viewed_at;
    if (!viewedAt) {
      viewedAt = new Date();
      await pool.query('UPDATE concerns SET admin_viewed_at = ? WHERE id = ?', [viewedAt, concernId]);
      invalidate('concerns', 'concern_detail', 'map_concerns');

      const io = req.app?.get('io');
      if (io) {
        io.to('admin').emit('concern_updated', { id: Number(concernId), admin_viewed_at: viewedAt });
        io.emit('concern_updated', { id: Number(concernId), admin_viewed_at: viewedAt });
        if (rows[0].user_id) {
          io.to(`user:${rows[0].user_id}`).emit('concern_viewed', { concernId: Number(concernId), admin_viewed_at: viewedAt });
          io.to(`user:${rows[0].user_id}`).emit('concern_updated', { id: Number(concernId), admin_viewed_at: viewedAt });
        }
      }
    }

    res.json({ success: true, admin_viewed_at: viewedAt });
  } catch (err) {
    console.error('markConcernViewed error:', err);
    res.status(500).json({ error: 'Failed to mark concern as viewed' });
  }
};

const createConcern = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      location_address,
      location_lat,
      location_lng,
      user_name,
      user_barangay,
    } = req.body;

    const image_url = req.file ? `${BASE_URL()}/uploads/${req.file.filename}` : null;

    let finalCategory = category || 'Other';
    let finalPriority = priority || 'Medium';
    let urgencyScore = 50;

    let contentFlag = 'none';
    let validityReason = '';
    let validityConfidence = 0;
    let aiResult = null;

    try {
      let imageTags = [];
      let filePath = null;
      if (req.file) {
        filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
        // If Groq Vision is available, it analyzes the image visually directly.
        // Running CPU-bound TensorFlow.js MobileNet locally blocks the Node.js event loop for 5-8s.
        if (!isGeminiAvailable()) {
          imageTags = await analyzeImage(filePath);
        }
      }

      // Feature 1: AI Auto-Classification
      const textInput = `Title: ${title}\nDescription: ${description}`;
      aiResult = await analyzeFullConcern(textInput, imageTags, filePath);
      if (aiResult) {
        finalCategory = aiResult.category || finalCategory;
        finalPriority = aiResult.priority || finalPriority;
        urgencyScore = aiResult.urgencyScore || urgencyScore;
        contentFlag = aiResult.contentFlag || 'none';
        validityReason = aiResult.validityReason || '';
        validityConfidence = aiResult.validityConfidence || 0;
      }
    } catch (e) {
      console.error('AI Categorization Error:', e);
    }

  // Auto-escalate priority if urgency is very high
  if (urgencyScore >= 85 && finalPriority !== 'High') {
    finalPriority = 'High';
    console.log(`[AI] Auto-escalated priority to High (urgency: ${urgencyScore})`);
  }

  // ─── AI photo & content alignment validation ──────────────────────────────
  // If a photo was attached, strictly check that it aligns with the reported concern
  if (req.file) {
    const isMismatched =
      aiResult &&
      (aiResult.imageMatchesConcern === false ||
        contentFlag === 'off_topic' ||
        contentFlag === 'inappropriate');

    if (isMismatched) {
      try {
        const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {
        console.error('[AI] Failed to remove mismatched upload:', e.message);
      }

      const reasonMsg =
        contentFlag === 'inappropriate'
          ? 'Your report was not submitted because the attached photo contains inappropriate content.'
          : (aiResult?.alignmentReason ||
             aiResult?.validityReason ||
             'The attached picture does not align with your reported concern. Please attach a clear photo that directly shows the issue.');

      console.log(`[AI] Rejected concern submission: photo does not align (${reasonMsg})`);

      return res.status(422).json({
        error: reasonMsg,
        code: contentFlag === 'inappropriate' ? 'INAPPROPRIATE_CONTENT' : 'IMAGE_MISMATCH',
        reason: reasonMsg,
      });
    }
  }

  // Clearly inappropriate content in text-only reports is rejected outright
  if (contentFlag === 'inappropriate' && validityConfidence >= 70) {
    if (req.file) {
      try {
        fs.unlinkSync(path.join(__dirname, '..', 'uploads', req.file.filename));
      } catch (e) {
        console.error('[AI] Failed to remove rejected upload:', e.message);
      }
    }
    console.log(`[AI] Rejected inappropriate submission from user ${req.user.id}: ${validityReason}`);
    return res.status(422).json({
      error:
        'Your report was not submitted because it appears to contain inappropriate content. Please submit only genuine community concerns.',
      code: 'INAPPROPRIATE_CONTENT',
    });
  }

  // Off-topic text-only reports are saved but labeled for admin review.
  const isNotTypical =
    (contentFlag === 'off_topic' && validityConfidence >= 60) ||
    (contentFlag === 'inappropriate' && validityConfidence < 70);
  if (isNotTypical) {
    finalCategory = NOT_TYPICAL_CATEGORY;
    finalPriority = 'Low';
    urgencyScore = 0;
  }

  // ─── Context signal: repeated reports in the same area raise priority ────
  if (!isNotTypical) {
    try {
      const lat = parseFloat(location_lat);
      const lng = parseFloat(location_lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const [rows] = await require('../db').query(
          `SELECT COUNT(*) AS nearby FROM concerns
           WHERE category = ?
             AND status IN ('Pending','In Progress')
             AND created_at > (NOW() - INTERVAL 30 DAY)
             AND location_lat IS NOT NULL AND location_lng IS NOT NULL
             AND (6371000 * ACOS(LEAST(1,
                   COS(RADIANS(?)) * COS(RADIANS(location_lat)) * COS(RADIANS(location_lng) - RADIANS(?))
                   + SIN(RADIANS(?)) * SIN(RADIANS(location_lat))))) < 150`,
          [finalCategory, lat, lng, lat],
        );
        const nearby = Number(rows[0]?.nearby || 0);
        const boosted = nearby >= 4 ? 'High' : nearby >= 2 ? raisePriority(finalPriority, 1) : finalPriority;
        if (boosted !== finalPriority) {
          console.log(`[AI] Priority raised ${finalPriority} -> ${boosted} (${nearby} similar open reports within 150 m)`);
          finalPriority = boosted;
          urgencyScore = Math.max(urgencyScore, boosted === 'High' ? 70 : 40);
        }
      }
    } catch (e) {
      console.error('[AI] Nearby-report priority check failed:', e.message);
    }
  }

  // ─── Feature 4: Department Routing (Centralized) ─────────────────────────
  const department = isNotTypical
    ? null
    : resolveDepartment(finalCategory, finalPriority);

  const insertId = await insertConcern({
      title,
      description,
      category: finalCategory,
      priority: finalPriority,
      image_url,
      location_address,
      location_lat,
      location_lng,
      user_id: req.user.id,
      user_name,
      user_barangay,
      department,
    });
    invalidate('concerns', 'concern_detail', 'map_concerns');

    if (isNotTypical) {
      await updateConcernFields(
        insertId,
        ['admin_note = ?'],
        [`[AI Flag: Not a typical concern] ${validityReason || 'Photo/text does not match a municipal concern category.'} Needs admin review.`],
      );
    } else if (finalPriority === 'High') {
      console.log(`[Priority] High-priority concern #${insertId} flagged. Awaiting Admin validation for urgent response bypass.`);

      // Notify citizen immediately that high priority report was received and is awaiting admin validation
      setImmediate(async () => {
        try {
          if (req.user?.id) {
            await insertNotification(
              req.user.id,
              '⚠️ Urgent Hazard Received — Awaiting Admin Validation',
              `Your urgent report "${title}" has been flagged as High Priority. It is currently awaiting Admin validation for immediate emergency response dispatch.`,
              insertId,
            );
          }
        } catch (notifErr) {
          console.error('[Notification] Error creating citizen high-priority received notif:', notifErr.message);
        }
      });
    }

    // ─── Feature 3: Duplicate Detection (async, non-blocking) ─────────────
    setImmediate(async () => {
      try {
        if (isNotTypical) return;
        const allConcerns = await selectAllConcerns();
        const newConcern = await selectConcernById(insertId);
        if (!newConcern) return;

        const similar = findSimilarConcerns(newConcern, allConcerns);
        let isDuplicate = false;
        let originalConcernId = null;

        for (const match of similar) {
          await insertConcernLink(insertId, match.concern.id, match.matchType, match.combinedScore);
          if (match.matchType === 'duplicate') {
            console.log(`[AI] Linked duplicate concern #${insertId} with original #${match.concern.id} (${match.combinedScore}% match)`);

            // Check previous concern's status:
            // If the original active concern is already 'In Progress', synchronize the duplicate concern's status,
            // department, and details so the duplicate reflects the active progress.
            if (!isDuplicate && match.concern.status === 'In Progress') {
              isDuplicate = true;
              originalConcernId = match.concern.id;

              const fieldsToUpdate = ['status = ?', 'updated_at = NOW()'];
              const valuesToUpdate = ['In Progress'];

              if (match.concern.department) {
                fieldsToUpdate.push('department = ?');
                valuesToUpdate.push(match.concern.department);
              }
              if (match.concern.admin_note) {
                fieldsToUpdate.push('admin_note = ?');
                valuesToUpdate.push(cleanOfficialResponse(match.concern.admin_note));
              }

              await updateConcernFields(insertId, fieldsToUpdate, valuesToUpdate);
              invalidate('concerns', 'concern_detail', 'map_concerns');

              try {
                if (req.user?.id) {
                  await insertNotification(
                    req.user.id,
                    '🔄 Active Incident Update — In Progress',
                    `Your reported concern "${title}" matches an existing open incident (#${match.concern.id}) that is currently In Progress. We are already addressing it!`,
                    insertId,
                  );
                }
              } catch (notifErr) {
                console.error('[Notification] Error creating duplicate in-progress notif:', notifErr.message);
              }

              const io = req.app.get('io');
              if (io) {
                const refreshed = await selectConcernById(insertId);
                if (refreshed) {
                  io.to(`user:${req.user?.id}`).emit('concern_status_changed', refreshed);
                  io.emit('concern_updated', refreshed);
                }
              }

              console.log(`[AI] Auto-synchronized duplicate concern #${insertId} to status 'In Progress' matching original #${match.concern.id}`);
            }
          }
        }

        if (similar.length > 0) {
          console.log(`[AI] Found ${similar.length} similar concern(s) for #${insertId}`);
        }
      } catch (e) {
        console.error('[AI] Duplicate detection error:', e.message);
      }
    });

    const newConcern = await selectConcernById(insertId);
    
    const io = req.app.get('io');
    
    // Broadcast via socket to admin portal
    if (io) {
      io.to('admin').emit('new_concern', newConcern);
      io.emit('new_concern', newConcern);
      io.to(`user:${req.user.id}`).emit('new_concern', newConcern);
      io.emit('concern_stats_updated', { concernId: newConcern.id, userId: req.user.id });
    }

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

    if (req.file) {
      const resolved_image_url = `${BASE_URL()}/uploads/${req.file.filename}`;
      fields.push('resolved_image_url = ?');
      values.push(resolved_image_url);

      try {
        const existingConcern = await selectConcernById(req.params.id);
        if (existingConcern && existingConcern.resolved_image_url) {
          deleteImageFile(existingConcern.resolved_image_url);
        }
      } catch (e) {
        console.error('Error deleting old resolved image:', e);
      }
    } else if (req.body.resolved_image_url === null || req.body.resolved_image_url === 'null') {
      fields.push('resolved_image_url = ?');
      values.push(null);
      try {
        const existingConcern = await selectConcernById(req.params.id);
        if (existingConcern && existingConcern.resolved_image_url) {
          deleteImageFile(existingConcern.resolved_image_url);
        }
      } catch (e) {}
    }
    if (status !== undefined && status !== concern.status) {
      const order = { Pending: 0, 'In Progress': 1, Resolved: 2, Rejected: 2 };
      const currentOrder = order[concern.status] ?? 0;
      const newOrder = order[status] ?? 0;
      if (newOrder < currentOrder) {
        return res.status(400).json({
          error: `Cannot revert status from "${concern.status}" to previous status "${status}"`,
        });
      }
      fields.push('status = ?');
      values.push(status);
    }
    if (admin_note !== undefined) {
      fields.push('admin_note = ?');
      values.push(admin_note || null);
    }
    if (category !== undefined) {
      fields.push('category = ?');
      values.push(category);
    }
    if (priority !== undefined) {
      fields.push('priority = ?');
      values.push(priority);
    }

    if (req.body.department !== undefined) {
      fields.push('department = ?');
      values.push(req.body.department || null);
    } else if (category !== undefined || priority !== undefined) {
      // Auto-update department when category or priority changes
      try {
        const existingConcern = await selectConcernById(req.params.id);
        const newCat = category || existingConcern.category;
        const newPri = priority || existingConcern.priority;
        const updatedDept = resolveDepartment(newCat, newPri);
        fields.push('department = ?');
        values.push(updatedDept);

      } catch (e) {
        console.error('AI Routing Error on edit:', e);
      }
    }

    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    if (req.user?.role === 'admin') {
      fields.push('admin_viewed_at = COALESCE(admin_viewed_at, NOW())');
    }
    fields.push('updated_at = NOW()');

    await updateConcernFields(req.params.id, fields, values);

    // ─── Cascade Status to Linked Duplicate Concerns ───
    if (status !== undefined || admin_note !== undefined || req.file) {
      try {
        const linked = await selectLinkedConcerns(req.params.id);
        const duplicateLinks = linked.filter(l => l.link_type === 'duplicate');

        for (const dup of duplicateLinks) {
          const dupFields = ['updated_at = NOW()'];
          const dupValues = [];

          if (status !== undefined) {
            dupFields.push('status = ?');
            dupValues.push(status);
          }
          if (admin_note !== undefined) {
            dupFields.push('admin_note = ?');
            dupValues.push(admin_note ? cleanOfficialResponse(admin_note) : null);
          }
          if (req.file) {
            const resolved_image_url = `${BASE_URL()}/uploads/${req.file.filename}`;
            dupFields.push('resolved_image_url = ?');
            dupValues.push(resolved_image_url);
          }

          if (dupFields.length > 1) {
            await updateConcernFields(dup.id, dupFields, dupValues);
            console.log(`[Duplicate Cascade] Applied status (${status || 'updated'}) to linked duplicate concern #${dup.id}`);


          }
        }
      } catch (cascadeErr) {
        console.error('[Duplicate Cascade Error]:', cascadeErr.message);
      }
    }

    // Audit log
    const changedFields = req.body;
    try {
      await logAudit(
        'concern',
        req.params.id,
        'edited',
        req.user.id,
        req.user.name,
        concern,
        { ...concern, ...changedFields }
      );
    } catch (e) {
      console.error('[Workflow] Audit log error:', e);
    }

    if (concern.user_id) {
      if (status && status !== concern.status) {
        await dispatchSystemNotification({
          userId: concern.user_id,
          userObj: concern,
          title: 'Concern Updated',
          message: `Your concern "${concern.title}" has been updated to ${status}. Check the app for details.`,
          socketRoom: `user:${concern.user_id}`,
          io: req.app.get('io'),
          concernId: concern.id,
        });
      }

      // Notify citizen when a proof photo is attached
      if (req.file) {
        const proofTitle = (status || concern.status) === 'Resolved'
          ? 'Proof of Completion Uploaded'
          : 'Work Update Photo Added';
        const proofMessage = (status || concern.status) === 'Resolved'
          ? `The city has uploaded a proof photo confirming your concern "${concern.title}" has been resolved. Open the app to view it.`
          : `A work-in-progress photo has been attached to your concern "${concern.title}". Open the app to see the latest update.`;

        await dispatchSystemNotification({
          userId: concern.user_id,
          userObj: concern,
          title: proofTitle,
          message: proofMessage,
          socketRoom: `user:${concern.user_id}`,
          io: req.app.get('io'),
          concernId: concern.id,
        });
      }
    }

    invalidate('concerns', 'concern_detail', 'map_concerns');
    const updatedConcern = await selectConcernById(req.params.id);

    // Get socket.io instance for notifications
    const io = req.app.get('io');



    
    // Broadcast via socket to admin portal
    if (io) {
      io.to('admin').emit('update_concern', updatedConcern);
      io.emit('update_concern', updatedConcern);
      io.emit('concern_updated', updatedConcern);
      if (updatedConcern.user_id) {
        io.to(`user:${updatedConcern.user_id}`).emit('concern_status_changed', updatedConcern);
      }
      io.emit('concern_stats_updated', { concernId: updatedConcern.id, userId: updatedConcern.user_id });
    }

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
    await deleteConcern(req.params.id);
    invalidate('concerns', 'concern_detail', 'map_concerns');

    const io = req.app.get('io');
    if (io) {
      io.emit('concern_deleted', { id: req.params.id, userId: concern.user_id });
      io.emit('concern_stats_updated', { id: req.params.id, userId: concern.user_id });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Concern delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
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

    const isHighRisk = concern.priority === 'High';

const KABANKALAN_BARANGAY_COORDS = [
  { name: 'Barangay 1', lat: 9.998, lng: 122.814 },
  { name: 'Barangay 2', lat: 10.001, lng: 122.812 },
  { name: 'Barangay 3', lat: 9.995, lng: 122.816 },
  { name: 'Barangay 4', lat: 9.992, lng: 122.818 },
  { name: 'Barangay 5', lat: 10.005, lng: 122.816 },
  { name: 'Barangay 6', lat: 10.008, lng: 122.820 },
  { name: 'Barangay 7', lat: 10.012, lng: 122.825 },
  { name: 'Barangay 8', lat: 10.015, lng: 122.830 },
  { name: 'Barangay 9', lat: 10.000, lng: 122.808 },
  { name: 'Bantayan', lat: 9.726, lng: 122.788 },
  { name: 'Binicuil', lat: 9.965, lng: 122.805 },
  { name: 'Camansi', lat: 9.940, lng: 122.880 },
  { name: 'Camingawan', lat: 9.820, lng: 122.950 },
  { name: 'Camugao', lat: 9.955, lng: 122.835 },
  { name: 'Carol-an', lat: 9.860, lng: 122.920 },
  { name: 'Daan Banua', lat: 10.010, lng: 122.785 },
  { name: 'Hilamonan', lat: 10.005, lng: 122.845 },
  { name: 'Inapoy', lat: 9.810, lng: 122.880 },
  { name: 'Linao', lat: 10.020, lng: 122.800 },
  { name: 'Locotan', lat: 9.930, lng: 122.840 },
  { name: 'Magballo', lat: 9.850, lng: 122.830 },
  { name: 'Oringao', lat: 9.891, lng: 122.866 },
  { name: 'Orong', lat: 9.910, lng: 122.800 },
  { name: 'Pinaguinpinan', lat: 9.950, lng: 122.780 },
  { name: 'Salong', lat: 9.970, lng: 122.760 },
  { name: 'Tabugon', lat: 9.780, lng: 122.850 },
  { name: 'Tagoc', lat: 9.930, lng: 122.770 },
  { name: 'Tagukon', lat: 9.740, lng: 122.830 },
  { name: 'Talubangi', lat: 10.015, lng: 122.825 },
  { name: 'Tampalon', lat: 9.900, lng: 122.920 },
  { name: 'Tan-awan', lat: 9.840, lng: 122.980 },
  { name: 'Tapi', lat: 9.870, lng: 122.800 }
];

const getIncidentBarangay = (concern) => {
  if (!concern) return 'Barangay 1';
  const address = (concern.location_address || '').trim();

  if (address) {
    if (/Aquiles\s*-?\s*Zayco/i.test(address) || /Zayco\s+Ave/i.test(address)) {
      return 'Barangay 1';
    }
    if (/Guanzon/i.test(address)) return 'Barangay 1';
    if (/Tayum/i.test(address)) return 'Barangay 2';
    if (/Coloso/i.test(address)) return 'Barangay 1';

    for (const b of KABANKALAN_BARANGAY_COORDS) {
      if (new RegExp(`\\b${b.name}\\b`, 'i').test(address)) {
        return b.name;
      }
    }

    const match = address.match(/(?:Barangay|Brgy\.?|Poblacion)\s+([A-Za-z0-9\s-]+?)(?:,|\.|$)/i);
    if (match && match[1]) {
      const trimmed = match[1].trim();
      if (/^\d+$/.test(trimmed)) {
        if (/Poblacion/i.test(match[0])) return `Poblacion ${trimmed}`;
        return `Barangay ${trimmed}`;
      }
      return trimmed;
    }
  }

  const lat = parseFloat(concern.location_lat);
  const lng = parseFloat(concern.location_lng);
  if (!isNaN(lat) && !isNaN(lng)) {
    let nearest = null;
    let minD = Infinity;
    for (const b of KABANKALAN_BARANGAY_COORDS) {
      const d = Math.hypot(b.lat - lat, b.lng - lng);
      if (d < minD) {
        minD = d;
        nearest = b.name;
      }
    }
    if (nearest) return nearest;
  }

  return concern.user_barangay || 'Barangay 1';
};

    // Try Gemini first
    if (isGeminiAvailable()) {
      const incidentBrgy = getIncidentBarangay(concern);
      const prompt = `You are a professional government administrator for Kabankalan City, Philippines (CitiVoice platform).
Write a concise, empathetic official response to this citizen concern.

Concern Details:
- Title: ${concern.title}
- Description: ${concern.description}
- Category: ${concern.category}
- Priority: ${concern.priority} ${isHighRisk ? '(CRITICAL / HIGH RISK EMERGENCY)' : ''}
- Status: ${concern.status}
- Department: ${concern.department || 'City Administration'}
- Incident Barangay: ${incidentBrgy}
- Location Address: ${concern.location_address || incidentBrgy}
- Submitting Citizen: ${concern.user_name || 'Citizen'} (Resident of: ${concern.user_barangay || 'Kabankalan City'})

GEOGRAPHIC ACCURACY INSTRUCTION:
- The actual incident location is: "${concern.location_address || incidentBrgy}" located in "${incidentBrgy}".
- The submitting citizen lives in ${concern.user_barangay || 'their home barangay'}, but the reported incident occurred at ${concern.location_address || incidentBrgy} in ${incidentBrgy}.
- NEVER state that the street or incident is located in the citizen's residential barangay if the location is elsewhere (e.g. Aquiles-Zayco Avenue is in Barangay 1 / Poblacion, NOT in Bantayan). Always use "${concern.location_address || incidentBrgy}" when referencing the location.

${isHighRisk ? `CRITICAL REQUIREMENT — HIGH RISK / IMMEDIATE EMERGENCY HAZARD:
- This concern is marked HIGH PRIORITY / CRITICAL HAZARD.
- You MUST state that an IMMEDIATE emergency response is actively underway (e.g. "Our Emergency Response Unit has been dispatched immediately to inspect and clear the site on ${concern.location_address || incidentBrgy}").
- DO NOT mention days or weeks. State immediate intervention (within hours/today).
- Include safety precautions for citizens (e.g., maintain safe distance, exercise extreme caution).` : `Requirements:
- Acknowledge the issue
- Explain what action will be taken
- Provide a realistic timeline (e.g., 2-3 business days)
- Thank the citizen for reporting`}

Write 2-4 sentences maximum. Be professional, reassuring, and emphasize immediate government action. Do not use markdown formatting.`;

      const aiResponse = await generateText(prompt, { temperature: 0.5, maxTokens: 300 });
      if (aiResponse) {
        return res.json({ response: aiResponse.trim(), source: 'gemini' });
      }
    }

    // Fallback: template-based response
    if (isHighRisk) {
      const highRiskTemplates = {
        'Road & Infrastructure': `[IMMEDIATE EMERGENCY RESPONSE] We have acknowledged this high-risk hazard regarding ${concern.title}. An Emergency Response Unit from the City Engineer's Office has been immediately dispatched to clear the obstruction and secure the roadway. Please exercise extreme caution and avoid the immediate area until cleared.`,
        Electricity: `[IMMEDIATE EMERGENCY RESPONSE] We have received your urgent report regarding ${concern.title}. NOCECO and CDRRMO emergency crews have been notified immediately for rapid dispatch to isolate electrical hazards and secure the vicinity. Please stay well clear of any wires or damaged poles.`,
        Drainage: `[IMMEDIATE EMERGENCY RESPONSE] This concern regarding ${concern.title} has been classified as high priority. Emergency drainage response teams have been deployed immediately to relieve hazardous water buildup and prevent further danger. Thank you for reporting this urgent hazard.`,
        'Waste & Sanitation': `[IMMEDIATE EMERGENCY RESPONSE] Your report regarding ${concern.title} has been flagged as high risk. Health and environmental emergency crews have been mobilized immediately to sanitize and address this urgent hazard.`,
        Other: `[IMMEDIATE EMERGENCY RESPONSE] We have received your high-priority report regarding ${concern.title}. Our Emergency Response Team has been mobilized immediately for on-site inspection and immediate corrective action. Please maintain a safe distance.`,
      };
      const template = highRiskTemplates[concern.category] || highRiskTemplates['Other'];
      return res.json({ response: template, source: 'template' });
    }

    const templates = {
      'Road & Infrastructure': `Thank you for reporting this issue regarding ${concern.title.toLowerCase()}. Our City Engineer's Office (CEO) has been notified and a team will be dispatched to assess the situation. We expect to begin work within the next 2-3 business days. We appreciate your help in keeping our roads safe.`,
      Electricity: `We have received your report about ${concern.title.toLowerCase()}. This has been forwarded to NOCECO for immediate attention. A repair crew will be scheduled within 24-48 hours. Thank you for helping us maintain our community's infrastructure.`,
      Drainage: `Thank you for reporting this concern. The City Engineer's Office (CEO) has been alerted about ${concern.title.toLowerCase()} and will send a drainage team to inspect the area. Expected response time is within 2-3 business days. Your vigilance helps keep our community safe.`,
      'Waste & Sanitation': `We acknowledge your report regarding ${concern.title.toLowerCase()}. CENRO has been notified and collection/cleanup will be prioritized. Please expect action within 1-3 business days. Thank you for helping maintain our community's cleanliness.`,
    };

    const template = templates[concern.category] || templates['Other'];
    res.json({ response: template, source: 'template' });
  } catch (err) {
    console.error('AI Response generation error:', err);
    res.status(500).json({ error: 'Failed to generate response' });
  }
};

// ─── Feature 1.5: AI Pre-submission Check ──────────────────────────────────

const analyzeConcernDraft = async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  try {
    const textInput = `Title: ${title}\nDescription: ${description}`;
    const aiResult = await analyzeFullConcern(textInput, []);

    // Auto-escalate priority if urgency is very high (same as createConcern logic)
    if (aiResult && aiResult.urgencyScore >= 85 && aiResult.priority !== 'High') {
      aiResult.priority = 'High';
    }

    res.json(aiResult);
  } catch (err) {
    console.error('AI Draft Analysis error:', err);
    res.status(500).json({ error: 'Failed to analyze draft' });
  }
};

const verifyConcernImage = async (req, res) => {
  const { title, description, category } = req.body;
  if (!req.file) {
    return res.status(400).json({ error: 'Image is required for verification' });
  }

  const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
  try {
    const result = await verifyImageAlignment(title, description, category, filePath);
    // Delete temp upload immediately to save disk space
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (_) {}

    return res.json(result);
  } catch (err) {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (_) {}
    console.error('Verify image error:', err);
    return res.status(500).json({ error: 'Failed to verify image' });
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
        computed: similar.map((s) => ({
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

  const sourceId = parseInt(req.params.id);
  const targetId = parseInt(target_id);

  try {
    await insertConcernLink(
      sourceId,
      targetId,
      link_type || 'related',
      req.body.similarity_score || null,
    );

    let appliedStatus = null;

    // If marked as duplicate, check target concern's status and apply it to source concern
    if (link_type === 'duplicate') {
      const targetConcern = await selectConcernById(targetId);
      const sourceConcern = await selectConcernById(sourceId);

      if (targetConcern && sourceConcern) {
        appliedStatus = targetConcern.status;
        const fieldsToUpdate = ['status = ?', 'updated_at = NOW()'];
        const valuesToUpdate = [targetConcern.status];

        if (targetConcern.admin_note) {
          fieldsToUpdate.push('admin_note = ?');
          valuesToUpdate.push(cleanOfficialResponse(targetConcern.admin_note));
        }
        if (targetConcern.department) {
          fieldsToUpdate.push('department = ?');
          valuesToUpdate.push(targetConcern.department);
        }
        if (targetConcern.resolved_image_url) {
          fieldsToUpdate.push('resolved_image_url = ?');
          valuesToUpdate.push(targetConcern.resolved_image_url);
        }

        await updateConcernFields(sourceId, fieldsToUpdate, valuesToUpdate);
        invalidate('concerns', 'concern_detail', 'map_concerns');

        if (sourceConcern.user_id && appliedStatus !== sourceConcern.status) {
          try {
            await insertNotification(
              sourceConcern.user_id,
              `Status Updated: ${sourceConcern.title}`,
              `Your concern "${sourceConcern.title}" has been linked to an existing report and updated to ${appliedStatus}.`,
              sourceId,
            );
          } catch (notifErr) {
            console.error('[Notification] Error creating link duplicate status notif:', notifErr.message);
          }

          const io = req.app.get('io');
          if (io) {
            const updated = await selectConcernById(sourceId);
            if (updated) {
              io.to(`user:${sourceConcern.user_id}`).emit('concern_status_changed', updated);
              io.emit('concern_updated', updated);
            }
          }
        }
      }
    }

    res.json({ success: true, applied_status: appliedStatus });
  } catch (err) {
    console.error('Link concerns error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getComments = async (req, res) => {
  const concernId = req.params.id;
  try {
    const pool = require('../db');
    // Fetch all discussion comments between citizens and administrators
    const [rows] = await pool.query(
      `SELECT c.id, c.concern_id, c.user_id, c.user_name, c.comment, c.image_url, c.created_at,
              u.avatar_url, u.role as user_role
       FROM concern_comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.concern_id = ?
       ORDER BY c.created_at ASC`,
      [concernId]
    );
    res.json(rows);
  } catch (err) {
    console.error('getComments error:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

const addComment = async (req, res) => {
  const concernId = req.params.id;
  const text = (req.body.comment || '').trim();
  const imageUrl = req.file ? `${BASE_URL()}/uploads/${req.file.filename}` : (req.body.image_url || null);

  if (!text && !imageUrl) {
    return res.status(400).json({ error: 'Comment text or image is required' });
  }

  try {
    const pool = require('../db');
    const isAdmin = req.user?.role === 'admin';
    const authorName = req.user?.name || (isAdmin ? 'Admin' : 'Citizen');

    const [result] = await pool.query(
      `INSERT INTO concern_comments (concern_id, user_id, user_name, comment, image_url)
       VALUES (?, ?, ?, ?, ?)`,
      [concernId, req.user?.id, authorName, text || '', imageUrl]
    );

    const newComment = {
      id: result.insertId,
      concern_id: Number(concernId),
      user_id: req.user?.id,
      user_name: authorName,
      user_role: req.user?.role || (isAdmin ? 'admin' : 'citizen'),
      comment: text,
      image_url: imageUrl,
      created_at: new Date().toISOString(),
    };

    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('new_comment', newComment);
      io.emit('concern_comment_added', newComment);
    }

    res.status(201).json({ success: true, comment: newComment });
  } catch (err) {
    console.error('addComment error:', err);
    res.status(500).json({ error: 'Failed to post comment' });
  }
};

const getAudit = async (req, res) => {
  try {
    const pool = require('../db');
    const [rows] = await pool.query(
      'SELECT * FROM audit_log WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC',
      ['concern', req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('getAudit error:', err);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
};

module.exports = {
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
};
