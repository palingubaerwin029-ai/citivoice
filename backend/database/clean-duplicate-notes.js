const pool = require('../db');

const cleanText = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\[(?:Auto-)?Duplicate(?: concern)? of [^\]]+\]\s*/gi, '').trim();
};

async function cleanDuplicateNotes() {
  console.log('[CleanNotes] Starting cleanup of duplicate prefixes in concerns...');
  try {
    const [rows] = await pool.query(
      "SELECT id, title, admin_note, approval_notes FROM concerns WHERE admin_note LIKE '%Duplicate%' OR approval_notes LIKE '%Duplicate%'"
    );

    console.log(`[CleanNotes] Found ${rows.length} rows to check.`);

    let updatedCount = 0;
    for (const row of rows) {
      const cleanedAdmin = cleanText(row.admin_note);
      const cleanedApproval = cleanText(row.approval_notes);

      if (cleanedAdmin !== row.admin_note || cleanedApproval !== row.approval_notes) {
        await pool.query(
          "UPDATE concerns SET admin_note = ?, approval_notes = ? WHERE id = ?",
          [cleanedAdmin, cleanedApproval, row.id]
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
