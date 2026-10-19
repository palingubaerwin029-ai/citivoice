'use strict';

/**
 * priorityService.js
 * Periodically escalates open concerns whose urgency grows over time:
 *   - Pending/In Progress for > 3 days  : Low    -> Medium
 *   - Pending/In Progress for > 7 days  : Medium -> High
 * Priority is only ever raised, never lowered. Flagged "Not a Typical Concern"
 * reports are ignored.
 */

const pool = require('../db');
const { NOT_TYPICAL_CATEGORY } = require('./aiService');

const INTERVAL_MS = parseInt(process.env.PRIORITY_ESCALATION_INTERVAL_MS, 10) || 60 * 60 * 1000;
let timer = null;

const OPEN = `status IN ('Pending','In Progress') AND category <> ?`;

const escalateStaleConcerns = async () => {
  const run = async (sql, params = []) => {
    const [res] = await pool.query(sql, params);
    return res.affectedRows || 0;
  };

  try {
    // Age-driven. Order matters: do Medium -> High first, then Low -> Medium,
    // so one run never moves a concern two levels.
    const ageHigh = await run(
      `UPDATE concerns SET priority = 'High'
       WHERE ${OPEN} AND priority = 'Medium' AND created_at < (NOW() - INTERVAL 7 DAY)`,
      [NOT_TYPICAL_CATEGORY],
    );
    const ageMed = await run(
      `UPDATE concerns SET priority = 'Medium'
       WHERE ${OPEN} AND priority = 'Low' AND created_at < (NOW() - INTERVAL 3 DAY)`,
      [NOT_TYPICAL_CATEGORY],
    );
    const total = ageHigh + ageMed;
    if (total > 0) {
      console.log(`[Priority] Escalated ${total} concern(s) by age (-> High: ${ageHigh}, -> Medium: ${ageMed})`);
    }
    return total;
  } catch (err) {
    console.error('[Priority] Escalation job failed:', err.message);
    return 0;
  }
};

const startScheduler = () => {
  if (timer) return;
  console.log(`[Priority] Escalation scheduler started (every ${INTERVAL_MS / 60000} min)`);
  setTimeout(escalateStaleConcerns, 30 * 1000).unref();
  timer = setInterval(escalateStaleConcerns, INTERVAL_MS);
  timer.unref();
};

const stopScheduler = () => {
  if (timer) clearInterval(timer);
  timer = null;
};

module.exports = { escalateStaleConcerns, startScheduler, stopScheduler };
