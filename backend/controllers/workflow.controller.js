const workflowModel = require('../models/workflow.model');
const workflowService = require('../services/workflowService');
const concernModel = require('../models/concern.model');
const { selectById } = require('../models/user.model');

const getAssignments = async (req, res) => {
  try {
    const assignments = await workflowModel.getAssignmentsByConcern(req.params.id);
    res.json(assignments);
  } catch (err) {
    console.error('getAssignments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const assignConcern = async (req, res) => {
  const { assigned_to, department, sla_hours } = req.body;
  try {
    const concern = await concernModel.selectConcernById(req.params.id);
    if (!concern) return res.status(404).json({ error: 'Concern not found' });

    const deadline = new Date();
    deadline.setHours(deadline.getHours() + (sla_hours || 72));

    const assignmentId = await workflowModel.insertAssignment({
      concern_id: concern.id,
      assigned_to,
      assigned_by: req.user.id,
      department,
      sla_hours: sla_hours || 72,
      sla_deadline: deadline,
      status: 'assigned'
    });

    await workflowService.logAudit(
      'concern',
      concern.id,
      'manual_assigned',
      req.user.id,
      req.user.name,
      null,
      { assigned_to, department, sla_hours }
    );

    // Notify the assigned admin
    if (assigned_to) {
      try {
        const assignedAdmin = await selectById(assigned_to);
        if (assignedAdmin) {
          const io = req.app.get('io');
          await workflowService.notifyAssignedAdmin(assignedAdmin, concern, io);
        }
      } catch (e) {
        console.error('[Workflow] Failed to notify assigned admin:', e.message);
      }
    }

    res.json({ success: true, assignmentId });
  } catch (err) {
    console.error('assignConcern error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getComments = async (req, res) => {
  try {
    const comments = await workflowModel.getCommentsByConcern(req.params.id);
    // If not admin, filter out internal comments
    if (req.user.role !== 'admin') {
      const publicComments = comments.filter(c => !c.is_internal);
      return res.json(publicComments);
    }
    res.json(comments);
  } catch (err) {
    console.error('getComments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const addComment = async (req, res) => {
  const { comment, is_internal } = req.body;
  try {
    const commentId = await workflowModel.insertComment({
      concern_id: req.params.id,
      user_id: req.user.id,
      user_name: req.user.name,
      comment,
      is_internal: req.user.role === 'admin' ? is_internal : false
    });
    res.json({ success: true, commentId });
  } catch (err) {
    console.error('addComment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAudit = async (req, res) => {
  try {
    const auditLog = await workflowModel.getAuditLog('concern', req.params.id);
    res.json(auditLog);
  } catch (err) {
    console.error('getAudit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getOverdueSLA = async (req, res) => {
  try {
    const overdue = await workflowModel.getOverdueAssignments();
    res.json(overdue);
  } catch (err) {
    console.error('getOverdueSLA error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAssignments,
  assignConcern,
  getComments,
  addComment,
  getAudit,
  getOverdueSLA
};
