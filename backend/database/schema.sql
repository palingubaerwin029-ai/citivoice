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
  verification_status ENUM('unverified','pending','verified','rejected') NOT NULL DEFAULT 'unverified',
  is_verified         TINYINT(1)          NOT NULL DEFAULT 0,
  id_type             VARCHAR(100)        DEFAULT NULL,
  id_number           VARCHAR(100)        DEFAULT NULL,
  id_image_url        TEXT                DEFAULT NULL,
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

-- ─── Announcements ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(500) NOT NULL,
  body       TEXT         NOT NULL,
  type       ENUM('info','warning','urgent','success') NOT NULL DEFAULT 'info',
  author     VARCHAR(255) DEFAULT NULL,
  barangay   VARCHAR(255) DEFAULT 'All Barangays',
  link       TEXT         DEFAULT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── Events ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(500) NOT NULL,
  description TEXT         DEFAULT NULL,
  category    ENUM('meeting','maintenance','health','emergency','celebration','other') NOT NULL DEFAULT 'other',
  date        DATETIME     NOT NULL,
  location    VARCHAR(255) DEFAULT NULL,
  organizer   VARCHAR(255) DEFAULT NULL,
  link        TEXT         DEFAULT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
