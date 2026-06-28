const pool = require('./db');

const queries = [
  `CREATE TABLE IF NOT EXISTS chat_sessions (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    session_token   VARCHAR(255) NOT NULL UNIQUE,
    title           VARCHAR(255) DEFAULT 'New Chat',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    session_id      INT NOT NULL,
    sender          ENUM('user', 'ai') NOT NULL,
    message         TEXT NOT NULL,
    context_data    JSON DEFAULT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
  )`
];

const run = async () => {
  try {
    for (const q of queries) {
      await pool.query(q);
    }
    console.log('Tables created successfully.');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};
run();
