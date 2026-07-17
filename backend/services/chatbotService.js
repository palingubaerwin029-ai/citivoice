const { generateText } = require('./groqService');
const chatbotModel = require('../models/chatbot.model');

const CITIZEN_SYSTEM_PROMPT = `You are the CitiVoice AI Assistant. You are an expert at helping citizens navigate the CitiVoice platform for Kabankalan City.
CitiVoice is a civic engagement platform where citizens can report concerns (potholes, water leaks, street light issues, etc.).
Answer questions concisely and politely. If the user asks in English, Tagalog, or Hiligaynon, respond in the same language.

Core Citizen Platform Knowledge:
- Categories: Road & Infrastructure, Electricity, Water & Drainage, Waste & Sanitation, Public Safety, and Other.
- Concern Statuses:
  - "Pending": Newly reported, awaiting administrator review and categorization.
  - "In Progress": Confirmed and assigned to a specific city department for repair/action.
  - "Resolved": Work is completed and verified.
  - "Rejected": Report is marked as spam, invalid, or out of scope.
- Citizens can upvote other reports to show community priority.
- If context data is provided (e.g., they are looking at a specific concern), use it to answer.
- Keep answers polite, brief, and helpful. Do not make up features.`;

const ADMIN_SYSTEM_PROMPT = `You are the CitiVoice AI Administrator Co-Pilot. You help administrators manage civic reports and operate the CitiVoice back-office system for Kabankalan City.
Answer queries with professional, analytical, and process-driven guidance.

Core Administrator Platform Knowledge:
- Managing Concerns: Admins review pending concerns, verify them, assign priorities (High, Medium, Low), and route them to specific departments.
- Concern Assignments & SLA: Every assignment has a default SLA duration (typically 72 hours). Admins monitor if tasks are completed within deadlines.
- Internal Comments: Admins can leave "internal comments" on a concern (admin-only discussion threads not visible to citizens).
- Duplicate Detection: CitiVoice uses AI duplicate detection (via similarity scores) to link duplicate or related concerns. Admins can view/confirm these linkages.
- Focus on helping admins execute operational tasks, query metrics, or determine the correct routing/handling workflow.`;

const processMessage = async (sessionToken, userMessage, contextData, userId, userRole = 'citizen') => {
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

  // Choose system prompt based on user role
  const systemPrompt = userRole === 'admin' ? ADMIN_SYSTEM_PROMPT : CITIZEN_SYSTEM_PROMPT;

  // Format prompt
  let prompt = `${systemPrompt}\n\n`;
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
