const workflowModel = require('../models/workflow.model');
const concernModel = require('../models/concern.model');

const PRIORITY_SLA = {
  High: 24,
  Medium: 72,
  Low: 168
};

const autoAssign = async (concern) => {
  // Use department from concern, fallback to generic routing
  const department = concern.department || 'General Services';
  const slaHours = PRIORITY_SLA[concern.priority] || 72;
  
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + slaHours);

  const assignmentId = await workflowModel.insertAssignment({
    concern_id: concern.id,
    department,
    sla_hours: slaHours,
    sla_deadline: deadline,
    status: 'assigned'
  });

  await logAudit('concern', concern.id, 'auto_assigned', null, 'System', null, { department, sla_hours: slaHours, deadline });
  
  return assignmentId;
};

const checkSLABreaches = async (io) => {
  try {
    const overdue = await workflowModel.getOverdueAssignments();
    for (const assignment of overdue) {
      // Auto-escalate
      await workflowModel.updateAssignmentStatus(assignment.id, 'escalated');
      
      // Update concern priority if not High
      if (assignment.priority !== 'High') {
        await concernModel.updateConcernFields(assignment.concern_id, ['priority = ?', 'updated_at = NOW()'], ['High', assignment.concern_id]);
      }

      await logAudit('assignment', assignment.id, 'sla_breached_escalated', null, 'System', { status: assignment.status }, { status: 'escalated' });

      if (io) {
        io.to('admin').emit('sla_warning', {
          concern_id: assignment.concern_id,
          title: assignment.title,
          message: `SLA breached for concern #${assignment.concern_id}. Auto-escalated to High priority.`
        });
      }
    }
  } catch (err) {
    console.error('Error checking SLA breaches:', err);
  }
};

const logAudit = async (entityType, entityId, action, changedBy, changedByName, oldValue, newValue) => {
  try {
    await workflowModel.insertAuditLog({
      entity_type: entityType,
      entity_id: entityId,
      action,
      changed_by: changedBy,
      changed_by_name: changedByName,
      old_value: oldValue,
      new_value: newValue
    });
  } catch (err) {
    console.error('Error logging audit:', err);
  }
};

module.exports = {
  autoAssign,
  checkSLABreaches,
  logAudit
};
