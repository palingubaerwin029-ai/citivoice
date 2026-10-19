-- ═══════════════════════════════════════════════════════════════════════════════
--  CitiVoice — MySQL 8 schema
--
--  Fresh install : mysql -u root -p < schema.sql
--                  (Docker mounts this file into /docker-entrypoint-initdb.d, so it
--                   runs automatically on a brand-new mysql_data volume.)
--  Existing DB   : do NOT re-run this to upgrade. Use `node database/migrate-sync-schema.js`
--                  (drops the legacy upvote objects and adds any missing columns/indexes).
--
--  This file is safe to re-run: every table is CREATE TABLE IF NOT EXISTS, all
--  indexes live inside the table definitions, and seed rows use INSERT IGNORE so
--  admin edits to barangays/departments are never overwritten.
--
--  Table map
--    Accounts   : users, email_verifications
--    Reference  : barangays, departments
--    Concerns   : concerns, concern_links, concern_assignments, concern_comments
--    Activity   : notifications, audit_log
--    AI chatbot : chat_sessions, chat_messages
--
--  Removed: community upvotes (concerns.upvotes column, concern_upvotes table).
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS citivoice CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE citivoice;

-- ─── Users (citizens, admins, mayor) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(255)  NOT NULL,
  email               VARCHAR(255)  NOT NULL,
  password_hash       VARCHAR(255)  NOT NULL,
  phone               VARCHAR(50)   DEFAULT NULL,
  barangay            VARCHAR(255)  DEFAULT NULL,
  address             VARCHAR(255)  DEFAULT NULL,                 -- street address, editable from the mobile profile
  role                ENUM('admin','citizen','mayor') NOT NULL DEFAULT 'citizen',
  department          VARCHAR(100)  DEFAULT NULL,                 -- department an admin belongs to
  verification_status ENUM('unverified','pending','verified','rejected') NOT NULL DEFAULT 'unverified',
  is_verified         TINYINT(1)    NOT NULL DEFAULT 0,
  id_type             VARCHAR(100)  DEFAULT NULL,
  id_number           VARCHAR(100)  DEFAULT NULL,
  id_image_url        TEXT          DEFAULT NULL,
  avatar_url          TEXT          DEFAULT NULL,
  fcm_token           TEXT          DEFAULT NULL,
  rejection_reason    TEXT          DEFAULT NULL,
  reset_otp           VARCHAR(255)  DEFAULT NULL,                 -- bcrypt hash of the password-reset OTP
  reset_otp_expires   DATETIME      DEFAULT NULL,
  submitted_at        DATETIME      DEFAULT NULL,
  verified_at         DATETIME      DEFAULT NULL,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY email (email),
  KEY idx_users_role         (role),
  KEY idx_users_verification (verification_status),
  KEY idx_users_phone        (phone),                             -- duplicate-phone check
  KEY idx_users_id_number    (id_number)                          -- duplicate-ID check
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Pre-registration email OTP ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_verifications (
  email       VARCHAR(255) PRIMARY KEY,
  otp_hash    VARCHAR(255) NOT NULL,
  expires_at  DATETIME     NOT NULL,
  is_verified TINYINT(1)   DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Barangays ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS barangays (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Departments (routing targets for approved concerns) ─────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  category      VARCHAR(100) DEFAULT NULL,                        -- concern category this department handles
  email         VARCHAR(255) DEFAULT NULL,                        -- notified when the mayor approves a concern
  contact_phone VARCHAR(50)  DEFAULT NULL,
  description   TEXT         DEFAULT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY name (name),
  UNIQUE KEY category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Concerns ────────────────────────────────────────────────────────────────
-- Workflow: citizen submits -> admin validates (is_validated) -> forwards to the
-- mayor -> mayor approves (approved_*) and routes to a department.
-- user_name / user_barangay are snapshots taken at submission time.
CREATE TABLE IF NOT EXISTS concerns (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  title              VARCHAR(500)  NOT NULL,
  description        TEXT          NOT NULL,
  category           VARCHAR(100)  NOT NULL,
  priority           ENUM('High','Medium','Low') NOT NULL DEFAULT 'Medium',
  status             ENUM('Pending','In Progress','Resolved','Rejected') NOT NULL DEFAULT 'Pending',
  image_url          TEXT          DEFAULT NULL,
  resolved_image_url TEXT          DEFAULT NULL,
  location_address   TEXT          DEFAULT NULL,
  location_lat       DECIMAL(10,7) DEFAULT NULL,
  location_lng       DECIMAL(10,7) DEFAULT NULL,
  user_id            INT           DEFAULT NULL,
  user_name          VARCHAR(255)  DEFAULT NULL,
  user_barangay      VARCHAR(255)  DEFAULT NULL,
  admin_note         TEXT          DEFAULT NULL,                  -- official response shown to the citizen
  is_validated       TINYINT(1)    NOT NULL DEFAULT 0,            -- admin has validated the report
  validated_at       DATETIME      DEFAULT NULL,
  validated_by_name  VARCHAR(255)  DEFAULT NULL,
  approval_notes     TEXT          DEFAULT NULL,
  approved_by_name   VARCHAR(255)  DEFAULT NULL,
  approved_at        DATETIME      DEFAULT NULL,
  department         VARCHAR(100)  DEFAULT NULL,
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_concerns_user_created (user_id, created_at),            -- "my concerns" list (also backs the FK)
  KEY idx_concerns_status       (status),
  KEY idx_concerns_category     (category),
  KEY idx_concerns_priority     (priority),
  KEY idx_concerns_created_at   (created_at),
  KEY idx_concerns_department   (department),
  KEY idx_concerns_barangay     (user_barangay),
  KEY idx_concerns_validated    (is_validated, status),
  CONSTRAINT concerns_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Concern Links (AI duplicate / related tracking) ─────────────────────────
CREATE TABLE IF NOT EXISTS concern_links (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  source_concern_id INT NOT NULL,
  target_concern_id INT NOT NULL,
  link_type         ENUM('duplicate','related') NOT NULL DEFAULT 'related',
  similarity_score  DECIMAL(5,2) DEFAULT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_link (source_concern_id, target_concern_id),
  KEY idx_links_target (target_concern_id),
  CONSTRAINT concern_links_ibfk_1 FOREIGN KEY (source_concern_id) REFERENCES concerns(id) ON DELETE CASCADE,
  CONSTRAINT concern_links_ibfk_2 FOREIGN KEY (target_concern_id) REFERENCES concerns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Concern Assignments (department routing) ────────────────────────────────
CREATE TABLE IF NOT EXISTS concern_assignments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  concern_id  INT NOT NULL,
  assigned_to INT DEFAULT NULL,
  assigned_by INT DEFAULT NULL,
  department  VARCHAR(100) DEFAULT NULL,
  status      ENUM('assigned','accepted','escalated','completed') NOT NULL DEFAULT 'assigned',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY concern_id (concern_id),
  KEY assigned_to (assigned_to),
  KEY assigned_by (assigned_by),
  KEY idx_assignments_status (status),
  CONSTRAINT concern_assignments_ibfk_1 FOREIGN KEY (concern_id)  REFERENCES concerns(id) ON DELETE CASCADE,
  CONSTRAINT concern_assignments_ibfk_2 FOREIGN KEY (assigned_to) REFERENCES users(id)    ON DELETE SET NULL,
  CONSTRAINT concern_assignments_ibfk_3 FOREIGN KEY (assigned_by) REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Concern Comments (internal admin / mayor discussion thread) ─────────────
CREATE TABLE IF NOT EXISTS concern_comments (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  concern_id        INT NOT NULL,
  user_id           INT NOT NULL,
  user_name         VARCHAR(255) DEFAULT NULL,
  comment           TEXT NOT NULL,
  is_internal       TINYINT(1) NOT NULL DEFAULT 1,
  target_department VARCHAR(100) DEFAULT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_comments_concern_created (concern_id, created_at),      -- thread listing (also backs the FK)
  KEY user_id (user_id),
  CONSTRAINT concern_comments_ibfk_1 FOREIGN KEY (concern_id) REFERENCES concerns(id) ON DELETE CASCADE,
  CONSTRAINT concern_comments_ibfk_2 FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Notifications (in-app + push) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT          NOT NULL,
  concern_id INT          DEFAULT NULL,
  title      VARCHAR(255) NOT NULL,
  message    TEXT         NOT NULL,
  is_read    TINYINT(1)   DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notifications_user_read    (user_id, is_read),          -- unread badge count
  KEY idx_notifications_user_created (user_id, created_at),       -- latest-50 list
  KEY fk_notifications_concern (concern_id),
  CONSTRAINT notifications_ibfk_1        FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_notifications_concern    FOREIGN KEY (concern_id) REFERENCES concerns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Audit Log (full history of changes) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  entity_type     VARCHAR(50)  NOT NULL,
  entity_id       INT          NOT NULL,
  action          VARCHAR(50)  NOT NULL,
  changed_by      INT          DEFAULT NULL,
  changed_by_name VARCHAR(255) DEFAULT NULL,
  old_value       JSON         DEFAULT NULL,
  new_value       JSON         DEFAULT NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY changed_by (changed_by),
  KEY idx_audit_entity (entity_type, entity_id, created_at),
  CONSTRAINT audit_log_ibfk_1 FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── AI Chatbot Sessions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT          NOT NULL,
  session_token VARCHAR(255) NOT NULL,
  title         VARCHAR(255) DEFAULT 'New Chat',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY session_token (session_token),
  KEY user_id (user_id),
  CONSTRAINT chat_sessions_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── AI Chatbot Messages ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  session_id   INT NOT NULL,
  sender       ENUM('user','ai') NOT NULL,
  message      TEXT NOT NULL,
  context_data JSON DEFAULT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_chat_messages_session_created (session_id, created_at),
  CONSTRAINT chat_messages_ibfk_1 FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════════════════════
--  Bootstrap data (INSERT IGNORE: existing rows and admin edits are left untouched)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Barangays of Kabankalan City
INSERT IGNORE INTO barangays (name) VALUES
  ('Barangay 1'), ('Barangay 2'), ('Barangay 3'), ('Barangay 4'), ('Barangay 5'),
  ('Barangay 6'), ('Barangay 7'), ('Barangay 8'), ('Barangay 9'),
  ('Bantayan'), ('Binicuil'), ('Camansi'), ('Camingawan'), ('Camugao'), ('Carol-an'),
  ('Daan Banua'), ('Hilamonan'), ('Inapoy'), ('Linao'), ('Locotan'), ('Magballo'),
  ('Oringao'), ('Orong'), ('Pinaguinpinan'), ('Salong'), ('Tabugon'), ('Tagoc'),
  ('Tagukon'), ('Talubangi'), ('Tampalon'), ('Tan-Awan'), ('Tapi');

-- Default departments for concern routing (manage the full list from the admin panel)
INSERT IGNORE INTO departments (name, category, email, contact_phone, description) VALUES
  ('City Engineer\'s Office (CEO)', 'Road & Infrastructure', 'engineering@kabankalancity.gov.ph', '(053) 471-2002',
   'Maintains public drainages, clears major blockages, repairs broken culverts, and builds new drainage systems along city-owned roads.'),
  ('City Environment and Natural Resources Office (CENRO)', 'Waste & Sanitation', 'sanitation@kabankalancity.gov.ph', '(053) 471-2005',
   'Manages garbage collection schedules, operates the city\'s sanitary landfill, and enforces anti-littering and waste segregation ordinances.'),
  ('Negros Occidental Electric Cooperative (NOCECO)', 'Electricity', 'noceco@kabankalancity.gov.ph', '(053) 471-2003',
   'Distributes electricity, manages power outages, repairs broken electric poles, handles meter connections, and processes your monthly bill.');
