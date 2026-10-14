const db = require('../db');

async function migrate() {
  console.log('🔄 Checking notifications table schema...');
  const [cols] = await db.query("SHOW COLUMNS FROM notifications LIKE 'concern_id'");
  if (cols.length === 0) {
    console.log('Adding concern_id column to notifications table...');
    await db.query('ALTER TABLE notifications ADD COLUMN concern_id INT DEFAULT NULL AFTER user_id');
    try {
      await db.query(
        'ALTER TABLE notifications ADD CONSTRAINT fk_notifications_concern FOREIGN KEY (concern_id) REFERENCES concerns(id) ON DELETE CASCADE'
      );
      console.log('Foreign key fk_notifications_concern created.');
    } catch (fkErr) {
      console.log('Note on foreign key:', fkErr.message);
    }
    console.log('✅ Added concern_id column successfully.');
  } else {
    console.log('ℹ️ concern_id column already exists.');
  }

  // Backfill existing concern-related notifications
  console.log('🔄 Backfilling concern_id for existing notifications...');
  try {
    // 1. Backfill by quoted concern title: e.g. "Your concern \"Title\" has been updated"
    const [concerns] = await db.query('SELECT id, user_id, title FROM concerns');
    let backfilledCount = 0;
    for (const c of concerns) {
      const [res] = await db.query(
        'UPDATE notifications SET concern_id = ? WHERE concern_id IS NULL AND (message LIKE ? OR message LIKE ?)',
        [c.id, `%"${c.title}"%`, `%“${c.title}”%`]
      );
      backfilledCount += res.affectedRows;
    }

    // 2. Backfill by pattern "#<id>"
    const [res2] = await db.query(
      "UPDATE notifications n JOIN concerns c ON n.message LIKE CONCAT('%#', c.id, '%') SET n.concern_id = c.id WHERE n.concern_id IS NULL"
    );
    backfilledCount += res2.affectedRows;

    console.log(`✅ Backfilled ${backfilledCount} notifications with their concern_id.`);
  } catch (err) {
    console.error('Backfill error:', err.message);
  }

  // Show sample
  const [sample] = await db.query('SELECT id, user_id, concern_id, title, message FROM notifications ORDER BY id DESC LIMIT 5');
  console.log('Sample notifications:', JSON.stringify(sample, null, 2));
}

migrate()
  .then(() => {
    console.log('Migration completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
