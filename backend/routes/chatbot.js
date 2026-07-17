const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const chatbotController = require('../controllers/chatbot.controller');

router.use(auth);

router.post('/message', chatbotController.sendMessage);
router.get('/:sessionToken', chatbotController.getHistory);

module.exports = router;
