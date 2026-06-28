const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

const createSession = async (userId) => {
  const token = uuidv4();
  const [result] = await pool.query(
    'INSERT INTO chat_sessions (user_id, session_token) VALUES (?, ?)',
    [userId, token]
  );
  return { id: result.insertId, token };
};

const getSessionByToken = async (token) => {
  const [rows] = await pool.query('SELECT * FROM chat_sessions WHERE session_token = ?', [token]);
  return rows[0];
};

const insertMessage = async (sessionId, sender, message, contextData = null) => {
  const [result] = await pool.query(
    'INSERT INTO chat_messages (session_id, sender, message, context_data) VALUES (?, ?, ?, ?)',
    [sessionId, sender, message, contextData ? JSON.stringify(contextData) : null]
  );
  return result.insertId;
};

const getMessagesBySession = async (sessionId) => {
  const [rows] = await pool.query('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC', [sessionId]);
  return rows;
};

module.exports = {
  createSession,
  getSessionByToken,
  insertMessage,
  getMessagesBySession
};
