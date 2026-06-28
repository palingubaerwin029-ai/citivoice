const { generateText } = require('./groqService');
const chatbotModel = require('../models/chatbot.model');

const SYSTEM_PROMPT = `You are the CitiVoice AI Assistant. You are an expert at helping citizens and administrators navigate the CitiVoice platform.
CitiVoice is a civic engagement platform for Kabankalan City where citizens can report concerns (potholes, water leaks, etc.).
Answer questions concisely and politely. If the user provides contextual data (e.g., they are looking at a specific concern), use that data to give a better answer.
Do not invent features that don't exist. If you don't know the answer, say so.`;

const processMessage = async (sessionToken, userMessage, contextData, userId) => {
  let session = null;
  
  if (sessionToken) {
    session = await chatbotModel.getSessionByToken(sessionToken);
  }

  if (!session) {
    // Create new session
    const newSession = await chatbotModel.createSession(userId);
    session = await chatbotModel.getSessionByToken(newSession.token);
  }

  // Save user message
  await chatbotModel.insertMessage(session.id, 'user', userMessage, contextData);

  // Retrieve past messages for context (last 10)
  const history = await chatbotModel.getMessagesBySession(session.id);
  const recentHistory = history.slice(-10);

  // Format prompt for Gemini
  let prompt = `${SYSTEM_PROMPT}\n\n`;
  if (contextData) {
    prompt += `CURRENT CONTEXT (The user is currently viewing this data): ${JSON.stringify(contextData)}\n\n`;
  }
  
  prompt += `Conversation History:\n`;
  for (const msg of recentHistory) {
    if (msg.sender === 'user') {
      prompt += `User: ${msg.message}\n`;
    } else {
      prompt += `CitiVoice AI: ${msg.message}\n`;
    }
  }
  
  prompt += `CitiVoice AI:`;

  try {
    const aiResponse = await generateText(prompt);
    
    if (!aiResponse) {
      // Gemini unavailable or returned empty — provide a graceful fallback
      const fallback = "I'm sorry, the AI service is temporarily unavailable. Please try again in a moment.";
      await chatbotModel.insertMessage(session.id, 'ai', fallback, null);
      return {
        sessionToken: session.session_token,
        message: fallback
      };
    }
    
    const cleanResponse = aiResponse.trim();
    
    // Save AI response
    await chatbotModel.insertMessage(session.id, 'ai', cleanResponse, null);
    
    return {
      sessionToken: session.session_token,
      message: cleanResponse
    };
  } catch (err) {
    console.error('Chatbot AI Error:', err);
    throw new Error('Failed to generate AI response');
  }
};

module.exports = {
  processMessage
};
