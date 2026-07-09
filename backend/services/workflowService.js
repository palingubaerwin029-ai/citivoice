const workflowModel = require('../models/workflow.model');
const concernModel = require('../models/concern.model');
const { selectAdminsByDepartment } = require('../models/user.model');
const { insertNotification } = require('../models/concern.model');

const PRIORITY_SLA = {
  High: 24,
  Medium: 72,
  Low: 168
};

/**
 * Extract the base department name from the concern's department field.
 * The concern stores "City Engineering Office — Maintenance Division",
 * but the users table stores just "City Engineering Office".
 */
const extractBaseDepartment = (departmentStr) => {
  if (!departmentStr) return null;
  // Split on the em-dash separator used in routeToDepartment output
  return departmentStr.split(' — ')[0].trim();
};

/**
 * Find the least-loaded admin in a department.
 * Returns the admin user object or null if none found.
 */
const findLeastLoadedAdmin = async (departmentName) => {
  try {
    const admins = await selectAdminsByDepartment(departmentName);
    if (admins.length === 0) return null;
    // Already sorted by active_assignments ASC, so first is least loaded
    return admins[0];
  } catch (err) {
    console.error('[Workflow] Error finding admin for department:', err.message);
    return null;
  }
};

/**
 * Send notification to an assigned admin (in-app + socket + email).
 * @param {object} admin - The admin user { id, name, email, fcm_token }
 * @param {object} concern - The concern being assigned
 * @param {object} io - Socket.io instance (optional)
 */
const notifyAssignedAdmin = async (admin, concern, io) => {
  if (!admin) return;

  const title = 'New Concern Assigned';
  const message = `Concern #${concern.id} "${concern.title}" (${concern.priority} priority, ${concern.category}) has been assigned to you.`;

  // In-app notification
  try {
    await insertNotification(admin.id, title, message);
  } catch (err) {
    console.error('[Workflow] Failed to insert admin notification:', err.message);
  }

  // Socket notification
  if (io) {
    // Admins join the 'admin' room, but also try user-specific room
    io.to('admin').emit('concern_assigned', {
      admin_id: admin.id,
      concern_id: concern.id,
      title: concern.title,
      message
    });
  }

  console.log(`[Workflow] Notified admin "${admin.name}" (ID: ${admin.id}) about concern #${concern.id}`);
};

const autoAssign = async (concern, io) => {
  // Use department from concern, fallback to generic routing
  const department = concern.department || 'General Services';
  const slaHours = PRIORITY_SLA[concern.priority] || 72;
  
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + slaHours);

  // Try to find a specific admin in this department
  const baseDepartment = extractBaseDepartment(department);
  const admin = baseDepartment ? await findLeastLoadedAdmin(baseDepartment) : null;

  const assignmentId = await workflowModel.insertAssignment({
    concern_id: concern.id,
    assigned_to: admin ? admin.id : null,
    department,
    sla_hours: slaHours,
    sla_deadline: deadline,
    status: 'assigned'
  });

  await logAudit('concern', concern.id, 'auto_assigned', null, 'System', null, {
    department,
    assigned_to: admin ? admin.id : null,
    assigned_to_name: admin ? admin.name : null,
    sla_hours: slaHours,
    deadline
  });

  // Notify the assigned admin
  if (admin) {
    await notifyAssignedAdmin(admin, concern, io);
  }
  
  return assignmentId;
};

/**
 * Re-assign a concern when its category/priority changes.
 * Marks old active assignments as 'completed' and creates a new one.
 * @param {object} concern - The updated concern (with new category/priority/department)
 * @param {object} io - Socket.io instance (optional)
 */
const reassignConcern = async (concern, io) => {
  try {
    // Mark existing active assignments as completed (superseded)
    const existingAssignments = await workflowModel.getAssignmentsByConcern(concern.id);
    for (const assignment of existingAssignments) {
      if (assignment.status !== 'completed') {
        await workflowModel.updateAssignmentStatus(assignment.id, 'completed');
        await logAudit('assignment', assignment.id, 'superseded_by_reroute', null, 'System',
          { status: assignment.status }, { status: 'completed' }
        );
      }
    }

    // Create new assignment with the updated department
    const assignmentId = await autoAssign(concern, io);

    await logAudit('concern', concern.id, 'reassigned', null, 'System', null, {
      new_department: concern.department,
      reason: 'category_or_priority_changed'
    });

    return assignmentId;
  } catch (err) {
    console.error('[Workflow] Reassignment error:', err);
    throw err;
  }
};

const checkSLABreaches = async (io) => {
  try {
    const overdue = await workflowModel.getOverdueAssignments();
    for (const assignment of overdue) {
      // Auto-escalate
      await workflowModel.updateAssignmentStatus(assignment.id, 'escalated');
      
      // Update concern priority if not High
      if (assignment.priority !== 'High') {
        await concernModel.updateConcernFields(assignment.concern_id, ['priority = ?', 'updated_at = NOW()'], ['High']);
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
  reassignConcern,
  notifyAssignedAdmin,
  checkSLABreaches,
  logAudit
};

