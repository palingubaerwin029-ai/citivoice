-- ═══════════════════════════════════════════════════════
--  CitiVoice — Add Avatar Column
--  Run: mysql -u root citivoice < database/add_avatar_column.sql
-- ═══════════════════════════════════════════════════════

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;
