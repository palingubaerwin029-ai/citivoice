-- ═══════════════════════════════════════════════════════
--  CitiVoice — Add Password Reset OTP Columns
--  Run: mysql -u root citivoice < database/add_reset_columns.sql
-- ═══════════════════════════════════════════════════════

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reset_otp VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reset_otp_expires DATETIME DEFAULT NULL;
