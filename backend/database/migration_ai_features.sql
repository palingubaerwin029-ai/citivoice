-- CitiVoice AI Features Migration
-- Run this on an EXISTING database to add AI feature columns
-- For fresh installs, use schema.sql instead

USE citivoice;

-- ─── New columns on concerns table ──────────────────────────────────────────
ALTER TABLE concerns ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT NULL;

-- ─── Concern Links (for duplicate/similar concern tracking) ─────────────────
CREATE TABLE IF NOT EXISTS concern_links (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  source_concern_id   INT NOT NULL,
  target_concern_id   INT NOT NULL,
  link_type           ENUM('duplicate','related') NOT NULL DEFAULT 'related',
  similarity_score    DECIMAL(5,2) DEFAULT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_link (source_concern_id, target_concern_id),
  FOREIGN KEY (source_concern_id) REFERENCES concerns(id) ON DELETE CASCADE,
  FOREIGN KEY (target_concern_id) REFERENCES concerns(id) ON DELETE CASCADE
);
