const pool = require('../db');

const cleanText = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\[(?:Auto-)?Duplicate(?: concern)? of [^\]]+\]\s*/gi, '').trim();
};

async function cleanDuplicateNotes() {
  console.log('[CleanNotes] Starting cleanup of duplicate prefixes in concerns...');
  try {
    const [rows] = await pool.query(
      "SELECT id, title, admin_note FROM concerns WHERE admin_note LIKE '%Duplicate%'"
    );

    console.log(`[CleanNotes] Found ${rows.length} rows to check.`);

    let updatedCount = 0;
    for (const row of rows) {
      const cleanedAdmin = cleanText(row.admin_note);

      if (cleanedAdmin !== row.admin_note) {
        await pool.query(
          "UPDATE concerns SET admin_note = ? WHERE id = ?",
          [cleanedAdmin, row.id]
        );
        console.log(`[CleanNotes] Cleaned concern #${row.id} ("${row.title}")`);
        console.log(`  Before admin_note: ${row.admin_note}`);
        console.log(`  After admin_note:  ${cleanedAdmin}`);
        updatedCount++;
      }
    }

    console.log(`[CleanNotes] Successfully updated ${updatedCount} concerns.`);
  } catch (err) {
    console.error('[CleanNotes Error]:', err);
  } finally {
    process.exit(0);
  }
}

cleanDuplicateNotes();
