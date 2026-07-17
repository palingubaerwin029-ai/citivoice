const chatbotService = require('../services/chatbotService');
const chatbotModel = require('../models/chatbot.model');

const sendMessage = async (req, res) => {
  const { sessionToken, message, contextData } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  try {
    const result = await chatbotService.processMessage(sessionToken, message, contextData, req.user.id, req.user.role);
    res.json(result);
  } catch (err) {
    console.error('Chatbot sendMessage error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getHistory = async (req, res) => {
  const { sessionToken } = req.params;
  try {
    const session = await chatbotModel.getSessionByToken(sessionToken);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    
    // Security check: ensure session belongs to user
    if (session.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const messages = await chatbotModel.getMessagesBySession(session.id);
    res.json(messages);
  } catch (err) {
    console.error('Chatbot getHistory error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  sendMessage,
  getHistory
};
