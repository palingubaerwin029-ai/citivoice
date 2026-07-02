-- CitiVoice MySQL Schema
-- Run this file first: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS citivoice CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE citivoice;

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(255)        NOT NULL,
  email               VARCHAR(255)        NOT NULL UNIQUE,
  password_hash       VARCHAR(255)        NOT NULL,
  phone               VARCHAR(50)         DEFAULT NULL,
  barangay            VARCHAR(255)        DEFAULT NULL,
  role                ENUM('admin','citizen') NOT NULL DEFAULT 'citizen',
  department          VARCHAR(100)        DEFAULT NULL,
  verification_status ENUM('unverified','pending','verified','rejected') NOT NULL DEFAULT 'unverified',
  is_verified         TINYINT(1)          NOT NULL DEFAULT 0,
  id_type             VARCHAR(100)        DEFAULT NULL,
  id_number           VARCHAR(100)        DEFAULT NULL,
  id_image_url        TEXT                DEFAULT NULL,
  avatar_url          TEXT                DEFAULT NULL,
  fcm_token           TEXT                DEFAULT NULL,
  rejection_reason    TEXT                DEFAULT NULL,
  submitted_at        DATETIME            DEFAULT NULL,
  verified_at         DATETIME            DEFAULT NULL,
  created_at          DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── Barangays ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS barangays (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── Departments ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL UNIQUE,
  category    VARCHAR(100) DEFAULT NULL UNIQUE,
  description TEXT         DEFAULT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── Concerns ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS concerns (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  title            VARCHAR(500)                            NOT NULL,
  description      TEXT                                    NOT NULL,
  category         VARCHAR(100)                            NOT NULL,
  priority         ENUM('High','Medium','Low')             NOT NULL DEFAULT 'Medium',
  status           ENUM('Pending','In Progress','Resolved','Rejected') NOT NULL DEFAULT 'Pending',
  image_url        TEXT                                    DEFAULT NULL,
  location_address TEXT                                    DEFAULT NULL,
  location_lat     DECIMAL(10,7)                           DEFAULT NULL,
  location_lng     DECIMAL(10,7)                           DEFAULT NULL,
  user_id          INT                                     DEFAULT NULL,
  user_name        VARCHAR(255)                            DEFAULT NULL,
  user_barangay    VARCHAR(255)                            DEFAULT NULL,
  admin_note       TEXT                                    DEFAULT NULL,
  upvotes          INT                                     NOT NULL DEFAULT 0,
  department       VARCHAR(100)                            DEFAULT NULL,
  created_at       DATETIME                                NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME                                NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ─── Concern Upvotes ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS concern_upvotes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  concern_id INT NOT NULL,
  user_id    INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_upvote (concern_id, user_id),
  FOREIGN KEY (concern_id) REFERENCES concerns(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Concern Links (AI duplicate/similar tracking) ──────────────────────────
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

-- ─── Notifications ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT          NOT NULL,
  title       VARCHAR(255) NOT NULL,
  message     TEXT         NOT NULL,
  is_read     BOOLEAN      DEFAULT false,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- ─── Concern Assignments (department routing + SLA) ──────────────────────────
CREATE TABLE IF NOT EXISTS concern_assignments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  concern_id      INT NOT NULL,
  assigned_to     INT DEFAULT NULL,
  assigned_by     INT DEFAULT NULL,
  department      VARCHAR(100),
  sla_hours       INT NOT NULL DEFAULT 72,
  sla_deadline    DATETIME NOT NULL,
  status          ENUM('assigned','accepted','escalated','completed') NOT NULL DEFAULT 'assigned',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (concern_id) REFERENCES concerns(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ─── Internal Comments (admin-only discussion thread) ────────────────────────
CREATE TABLE IF NOT EXISTS concern_comments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  concern_id      INT NOT NULL,
  user_id         INT NOT NULL,
  user_name       VARCHAR(255),
  comment         TEXT NOT NULL,
  is_internal     BOOLEAN NOT NULL DEFAULT true,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (concern_id) REFERENCES concerns(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Audit Log (full history) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  entity_type     VARCHAR(50) NOT NULL,
  entity_id       INT NOT NULL,
  action          VARCHAR(50) NOT NULL,
  changed_by      INT DEFAULT NULL,
  changed_by_name VARCHAR(255),
  old_value       JSON DEFAULT NULL,
  new_value       JSON DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ─── AI Chatbot Sessions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  session_token   VARCHAR(255) NOT NULL UNIQUE,
  title           VARCHAR(255) DEFAULT 'New Chat',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── AI Chatbot Messages ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  session_id      INT NOT NULL,
  sender          ENUM('user', 'ai') NOT NULL,
  message         TEXT NOT NULL,
  context_data    JSON DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- ─── Essential Bootstrap Data ───────────────────────────────────────────────

-- Comprehensive Barangay list for Kabankalan City
INSERT INTO barangays (name) VALUES
  ('Barangay 1 (Poblacion)'), ('Barangay 2 (Poblacion)'), ('Barangay 3 (Poblacion)'),
  ('Barangay 4 (Poblacion)'), ('Barangay 5 (Poblacion)'), ('Barangay 6 (Poblacion)'),
  ('Barangay 7 (Poblacion)'), ('Barangay 8 (Poblacion)'), ('Barangay 9 (Poblacion)'),
  ('Bantayan'), ('Binicuil'), ('Camansi'), ('Camingawan'), ('Camugao'), ('Carol-an'),
  ('Daan Banua'), ('Hilamonan'), ('Inapoy'), ('Linao'), ('Locotan'), ('Magballo'),
  ('Oringao'), ('Orong'), ('Pinaguinpinan'), ('Salong'), ('Tabugon'), ('Tagoc'),
  ('Tagukon'), ('Talubangi'), ('Tampalon'), ('Tan-Awan'), ('Tapi')
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- Comprehensive Department list for Kabankalan City routing
INSERT INTO departments (name, category, description) VALUES
  ('City Engineering Office', 'Road & Infrastructure', 'Handles road repairs, bridge maintenance, and other public infrastructure.'),
  ('NOCECO / Electric Utility', 'Electricity', 'Manages streetlights, electrical posts, power issues, and wiring concerns.'),
  ('City Water District', 'Water & Drainage', 'Responsible for clean water supply, pipe bursts, and drainage/flooding systems.'),
  ('City Sanitation Division', 'Waste & Sanitation', 'Coordinates garbage collection, waste management, and public sanitation.'),
  ('PNP / Barangay Tanod', 'Public Safety', 'Enforces public order, traffic safety, and immediate emergency response.'),
  ('City Admin Office', 'Other', 'Administrative support, policy implementation, and general inquiries.'),
  ('Barangay Hall', NULL, 'Local barangay affairs, community relations, and low-priority local concerns.')
ON DUPLICATE KEY UPDATE category = VALUES(category), description = VALUES(description), updated_at = NOW();

-- ─── Performance Indexes ────────────────────────────────────────────────────
-- Note: MySQL does not natively support "CREATE INDEX IF NOT EXISTS".
-- To prevent errors when re-running this file on an existing DB, these should ideally 
-- be managed via an ORM or a custom script. 

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_verification ON users(verification_status);

CREATE INDEX idx_concerns_status ON concerns(status);
CREATE INDEX idx_concerns_category ON concerns(category);
CREATE INDEX idx_concerns_priority ON concerns(priority);
CREATE INDEX idx_concerns_created_at ON concerns(created_at);
CREATE INDEX idx_concerns_department ON concerns(department);
CREATE INDEX idx_concerns_barangay ON concerns(user_barangay);

CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);

CREATE INDEX idx_assignments_status ON concern_assignments(status);
CREATE INDEX idx_assignments_deadline ON concern_assignments(sla_deadline);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
