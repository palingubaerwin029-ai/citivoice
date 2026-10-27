-- ═══════════════════════════════════════════════════════════════════════════════
--  CitiVoice — MySQL 8 Production Schema
--
--  Fresh install : mysql -u root -p < schema.sql
--                  (Docker mounts this file into /docker-entrypoint-initdb.d, so it
--                   runs automatically on a brand-new mysql_data volume.)
--  Existing DB   : Run `node database/migrate-sync-schema.js` to synchronize
--                  missing columns, performance indexes, and security tables.
--
--  Table Architecture
--    Authentication & Security : users, admin_2fa_codes, email_verifications
--    Civic Incident Tracking   : concerns, concern_links
--    Activity & Traceability   : notifications, audit_log
--    Geographic Reference      : barangays
--    Persistent Cloud Media    : file_storage
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS citivoice CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE citivoice;

-- ─── 1. Users (citizens and administrators) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(255)  NOT NULL,
  email               VARCHAR(255)  NOT NULL,
  password_hash       VARCHAR(255)  NOT NULL,
  phone               VARCHAR(50)   DEFAULT NULL,
  barangay            VARCHAR(255)  DEFAULT NULL,
  address             VARCHAR(255)  DEFAULT NULL,                 -- street / purok address
  role                ENUM('admin','citizen') NOT NULL DEFAULT 'citizen',
  verification_status ENUM('unverified','pending','verified','rejected') NOT NULL DEFAULT 'unverified',
  is_verified         TINYINT(1)    NOT NULL DEFAULT 0,
  id_type             VARCHAR(100)  DEFAULT NULL,
  id_number           VARCHAR(100)  DEFAULT NULL,
  id_image_url        TEXT          DEFAULT NULL,
  avatar_url          TEXT          DEFAULT NULL,
  fcm_token           TEXT          DEFAULT NULL,
  rejection_reason    TEXT          DEFAULT NULL,
  reset_otp           VARCHAR(255)  DEFAULT NULL,                 -- bcrypt hash of password-reset OTP
  reset_otp_expires   DATETIME      DEFAULT NULL,
  submitted_at        DATETIME      DEFAULT NULL,
  verified_at         DATETIME      DEFAULT NULL,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY email (email),
  KEY idx_users_role         (role),
  KEY idx_users_verification (verification_status),
  KEY idx_users_phone        (phone),
  KEY idx_users_id_number    (id_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 2. Administrator 2FA Verification Codes (Email OTP) ───────────────────────
CREATE TABLE IF NOT EXISTS admin_2fa_codes (
  user_id    INT PRIMARY KEY,
  otp_hash   VARCHAR(255) NOT NULL,
  expires_at DATETIME     NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_2fa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 3. Pre-Registration Email OTP Verification ──────────────────────────────
CREATE TABLE IF NOT EXISTS email_verifications (
  email       VARCHAR(255) PRIMARY KEY,
  otp_hash    VARCHAR(255) NOT NULL,
  expires_at  DATETIME     NOT NULL,
  is_verified TINYINT(1)   DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 4. Barangays Reference (32 Kabankalan Barangays) ─────────────────────────
CREATE TABLE IF NOT EXISTS barangays (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 5. Civic Incident Concerns ──────────────────────────────────────────────
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
  user_barangay      VARCHAR(255)  DEFAULT NULL,                  -- citizen home barangay snapshot
  incident_barangay  VARCHAR(255)  DEFAULT NULL,                  -- matched barangay of actual incident coordinates
  admin_note         TEXT          DEFAULT NULL,                  -- official response shown to the citizen
  admin_viewed_at    DATETIME      DEFAULT NULL,                  -- timestamp when administrator first opened/viewed concern
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_concerns_user_created     (user_id, created_at),
  KEY idx_concerns_status           (status),
  KEY idx_concerns_category         (category),
  KEY idx_concerns_priority         (priority),
  KEY idx_concerns_created_at       (created_at),
  KEY idx_concerns_barangay         (user_barangay),
  KEY idx_concerns_incident_barangay(incident_barangay),
  CONSTRAINT concerns_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 6. Concern Links (AI duplicate & related concern tracking) ───────────────
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

-- ─── 7. In-App Notifications & Alerts ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT          NOT NULL,
  concern_id INT          DEFAULT NULL,
  title      VARCHAR(255) NOT NULL,
  message    TEXT         NOT NULL,
  is_read    TINYINT(1)   DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notifications_user_read    (user_id, is_read),
  KEY idx_notifications_user_created (user_id, created_at),
  KEY fk_notifications_concern       (concern_id),
  CONSTRAINT notifications_ibfk_1     FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_notifications_concern FOREIGN KEY (concern_id) REFERENCES concerns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 8. Concern Comments (citizen discussions and administrative replies) ───────
CREATE TABLE IF NOT EXISTS concern_comments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  concern_id INT          NOT NULL,
  user_id    INT          NOT NULL,
  user_name  VARCHAR(255) DEFAULT NULL,
  comment    TEXT         NOT NULL,
  image_url  VARCHAR(1000) DEFAULT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_comments_concern_created (concern_id, created_at),
  KEY fk_concern_comments_user     (user_id),
  CONSTRAINT fk_concern_comments_concern FOREIGN KEY (concern_id) REFERENCES concerns(id) ON DELETE CASCADE,
  CONSTRAINT fk_concern_comments_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 9. Audit Log (immutable chronological administrative activity) ───────────
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

-- ─── 10. Persistent File & Image Storage (Survives Ephemeral Cloud Restarts) ────
CREATE TABLE IF NOT EXISTS file_storage (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  filename   VARCHAR(255) NOT NULL UNIQUE,
  mimetype   VARCHAR(100) DEFAULT NULL,
  data       LONGBLOB     NOT NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  KEY idx_file_storage_filename (filename)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════════════════════
--  Bootstrap Data (INSERT IGNORE: existing records are left untouched)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 32 Barangays of Kabankalan City, Negros Occidental
INSERT IGNORE INTO barangays (name) VALUES
  ('Barangay 1'), ('Barangay 2'), ('Barangay 3'), ('Barangay 4'), ('Barangay 5'),
  ('Barangay 6'), ('Barangay 7'), ('Barangay 8'), ('Barangay 9'),
  ('Bantayan'), ('Binicuil'), ('Camansi'), ('Camingawan'), ('Camugao'), ('Carol-an'),
  ('Daan Banua'), ('Hilamonan'), ('Inapoy'), ('Linao'), ('Locotan'), ('Magballo'),
  ('Oringao'), ('Orong'), ('Pinaguinpinan'), ('Salong'), ('Tabugon'), ('Tagoc'),
  ('Tagukon'), ('Talubangi'), ('Tampalon'), ('Tan-Awan'), ('Tapi');
