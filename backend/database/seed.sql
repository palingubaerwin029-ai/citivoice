-- CitiVoice Seed Data
-- Run after schema.sql: mysql -u root -p citivoice < seed.sql

USE citivoice;

-- Default admin account
-- Password: admin123 (bcrypt hash)
INSERT INTO users (name, email, password_hash, role, verification_status, is_verified)
VALUES (
  'Admin',
  'admin@citivoice.gov.ph',
  '$2a$10$N38TYy2iCILpTRuo5GmBqufH1KC3b88sBVc.fk.inV.ovZAnVCJU.',
  'admin',
  'verified',
  1
) ON DUPLICATE KEY UPDATE updated_at = NOW();

-- Sample barangays for Kabankalan City
INSERT INTO barangays (name) VALUES
  ('Barangay 1 (Poblacion)'),
  ('Barangay 2 (Poblacion)'),
  ('Barangay 3 (Poblacion)'),
  ('Barangay 4 (Poblacion)'),
  ('Barangay 5 (Poblacion)'),
  ('Barangay 6 (Poblacion)'),
  ('Barangay 7 (Poblacion)'),
  ('Barangay 8 (Poblacion)'),
  ('Barangay 9 (Poblacion)'),
  ('Bantayan'),
  ('Binicuil'),
  ('Camansi'),
  ('Camingawan'),
  ('Camugao'),
  ('Carol-an'),
  ('Daan Banua'),
  ('Hilamonan'),
  ('Inapoy'),
  ('Linao'),
  ('Locotan'),
  ('Magballo'),
  ('Oringao'),
  ('Orong'),
  ('Pinaguinpinan'),
  ('Salong'),
  ('Tabugon'),
  ('Tagoc'),
  ('Tagukon'),
  ('Talubangi'),
  ('Tampalon'),
  ('Tan-Awan'),
  ('Tapi')
ON DUPLICATE KEY UPDATE updated_at = NOW();
