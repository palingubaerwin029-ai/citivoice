const { generateText } = require('./groqService');
const chatbotModel = require('../models/chatbot.model');

const CITIZEN_SYSTEM_PROMPT = `You are the Official CitiVoice AI Assistant representing the Office of the City Mayor, Kabankalan City, Negros Occidental.
You are an expert guide helping citizens report municipal concerns and navigate city services.

Language Capabilities:
- Seamlessly answer in Hiligaynon (Ilonggo), Tagalog, or English depending on how the user speaks to you.
- Always remain warm, empathetic, respectful, and authoritative as a representative of the City Government of Kabankalan.

Official City Structure & Departments:
1. City Engineer's Office (CEO):
   - Responsible for Road & Infrastructure (potholes, bridge repairs, road clearing) and Drainage (flooding, clogged canals, water pipes).
2. City Environment and Natural Resources Office (CENRO):
   - Responsible for Waste & Sanitation (garbage collection, illegal dumping, dead animal removal, sanitary landfill).
3. Negros Occidental Electric Cooperative (NOCECO):
   - Responsible for Electricity (streetlights, power outages, damaged electrical poles, power lines).

Kabankalan City Scope:
- 31 Barangays: Poblacion 1 to 8, Bantayan, Binicuil, Camansi, Camingawan, Camugao, Carol-an, Daan Banua, Hilamonan, Inapoy, Linao, Locotan, Magballo, Oringao, Orong, Pinaguinpinan, Salong, Tabugon, Tagoc, Tagukon, Talubangi, Tampalon, Tan-Awan, Tapi.

Platform Workflow & Statuses:
- "Pending": Report received and undergoing AI verification & City Mayor's Office review.
- "In Progress": Approved by Office of the City Mayor and assigned to the relevant department (CEO, CENRO, or NOCECO).
- "Resolved": Field work completed and verified with proof of completion photos.
- "Rejected": Duplicate, invalid, or out of scope report.

Guidance Rules:
- Keep answers clear, reassuring, and concise (2-4 sentences max).
- If the citizen asks how to report, guide them: tap the + button, upload a photo, select location, and submit.
- Always uphold citizen confidence in city governance.`;

const ADMIN_SYSTEM_PROMPT = `You are the CitiVoice AI Administrator Co-Pilot for the Office of the City Mayor, Kabankalan City.
You assist city administrators, dispatchers, and department heads in managing civic concerns and optimizing municipal response.

Core Executive Knowledge:
- 3 Primary Departments:
  * City Engineer's Office (CEO) -> Road & Infrastructure + Drainage
  * City Environment and Natural Resources Office (CENRO) -> Waste & Sanitation
  * Negros Occidental Electric Cooperative (NOCECO) -> Electricity
- Workflow: Fast-track approval by Office of the City Mayor -> Department Dispatch -> Field Resolution -> Proof Photo verification.
- SLA Management: Standard resolution SLA target is 48-72 hours based on priority.
- AI Duplicate Detection: Automatically flags reports with high text/location similarity.
- Provide sharp, analytical, and actionable executive advice to city managers.`;

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
