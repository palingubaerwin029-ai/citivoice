const pool = require('./db');

const indexes = [
  'CREATE INDEX idx_users_role ON users(role)',
  'CREATE INDEX idx_users_verification ON users(verification_status)',
  'CREATE INDEX idx_concerns_status ON concerns(status)',
  'CREATE INDEX idx_concerns_category ON concerns(category)',
  'CREATE INDEX idx_concerns_priority ON concerns(priority)',
  'CREATE INDEX idx_concerns_created_at ON concerns(created_at)',
  'CREATE INDEX idx_concerns_department ON concerns(department)',
  'CREATE INDEX idx_concerns_barangay ON concerns(user_barangay)',
  'CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read)',
  'CREATE INDEX idx_assignments_status ON concern_assignments(status)',
  'CREATE INDEX idx_assignments_deadline ON concern_assignments(sla_deadline)',
  'CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id)'
];

const run = async () => {
  try {
    console.log('Applying indexes...');
    for (const stmt of indexes) {
      try {
        await pool.query(stmt);
        console.log(`Success: ${stmt}`);
      } catch (err) {
        if (err.code === 'ER_DUP_KEYNAME') {
          console.log(`Skipped (already exists): ${stmt}`);
        } else {
          console.error(`Error on ${stmt}: ${err.message}`);
        }
      }
    }
    console.log('Finished applying indexes.');
    process.exit(0);
  } catch (e) {
    console.error('Fatal error:', e);
    process.exit(1);
  }
};
run();
