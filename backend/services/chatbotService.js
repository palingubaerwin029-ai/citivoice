const { generateText, generateJSON } = require('./groqService');
const chatbotModel = require('../models/chatbot.model');
const pool = require('../db');

const CITIZEN_SYSTEM_PROMPT = `You are the Official CitiVoice AI Assistant representing the Office of the City Mayor, Kabankalan City, Negros Occidental.
You are an expert guide helping citizens report municipal concerns, follow up on reports, and navigate city services.

Language Capabilities:
- Seamlessly answer in Hiligaynon (Ilonggo), Tagalog, or English depending on how the user speaks to you.
- Always remain warm, empathetic, respectful, and authoritative as a representative of the City Government of Kabankalan.

Official City Structure & Departments:
1. City Engineer's Office (CEO): Road & Infrastructure (potholes, bridges) and Drainage (floods, clogged canals, water pipes).
2. City Environment and Natural Resources Office (CENRO): Waste & Sanitation (garbage collection, illegal dumping, dead animals).
3. Negros Occidental Electric Cooperative (NOCECO): Electricity (streetlights, power lines, power outages).

Kabankalan City Scope:
- 31 Barangays: Poblacion 1 to 8, Bantayan, Binicuil, Camansi, Camingawan, Camugao, Carol-an, Daan Banua, Hilamonan, Inapoy, Linao, Locotan, Magballo, Oringao, Orong, Pinaguinpinan, Salong, Tabugon, Tagoc, Tagukon, Talubangi, Tampalon, Tan-Awan, Tapi.

SPECIAL INTENT DETECTOR INSTRUCTIONS:
Always respond with a strictly valid JSON object with these keys:
- "message": A warm, professional response to the citizen in the user's language (Hiligaynon/English/Tagalog).
- "action": One of ["GENERAL_REPLY", "DRAFT_REPORT", "ESCALATE_CONCERN"].
- "draft": If the citizen describes a municipal problem/issue they want fixed (e.g. "guba dalan sa Oringao", "flooding in Salong"), generate this object:
    { "title": "Concise Report Title", "description": "Detailed description", "category": "Road & Infrastructure" | "Electricity" | "Drainage" | "Waste & Sanitation", "priority": "High" | "Medium" | "Low", "barangay": "Detected Barangay Name or null" }
- "escalation": If the citizen asks to follow up, hurry up, or escalate a reported concern (e.g. "Follow up my report", "Akon concern #14 wala pa kasolbar"), generate this object:
    { "concernId": number or null, "reason": "Citizen request for expedited action" }

Return ONLY JSON. No markdown wrappers.`;

const ADMIN_SYSTEM_PROMPT = `You are the CitiVoice AI Administrator Co-Pilot for the Office of the City Mayor, Kabankalan City.
You assist city administrators, dispatchers, and department heads in managing civic concerns and optimizing municipal response.

Core Executive Knowledge:
- 3 Primary Departments: CEO (Road & Infrastructure + Drainage), CENRO (Waste & Sanitation), NOCECO (Electricity).
- SLA Management: Standard resolution target 48-72 hours.
- Use LIVE CITY METRICS provided in context to answer queries accurately with exact figures.

Output JSON format:
{
  "message": "Analytical executive response",
  "action": "GENERAL_REPLY"
}
Return ONLY JSON. No markdown wrappers.`;

/**
 * Fetch live context data for the user/admin session
 */
const fetchLiveSessionContext = async (userId, userRole) => {
  try {
    if (userRole === 'admin') {
      const [rows] = await pool.query(`
        SELECT status, COUNT(*) AS count 
        FROM concerns 
        GROUP BY status
      `);
      const metrics = {};
      let total = 0;
      for (const r of rows) {
        metrics[r.status] = r.count;
        total += r.count;
      }
      metrics.Total = total;
      return { liveCityMetrics: metrics };
    } else if (userId) {
      const [rows] = await pool.query(
        `SELECT id, title, category, status, priority, department, created_at 
         FROM concerns 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT 5`,
        [userId]
      );
      return { liveUserReports: rows };
    }
  } catch (err) {
    console.error('[Chatbot AI] Error fetching live context:', err.message);
  }
  return {};
};

/**
 * Handle citizen escalation ping for a concern
 */
const handleEscalationPing = async (userId, concernId, reason) => {
  try {
    let concern = null;
    if (concernId) {
      const [rows] = await pool.query('SELECT id, title FROM concerns WHERE id = ?', [concernId]);
      if (rows.length > 0) concern = rows[0];
    }
    if (!concern && userId) {
      const [rows] = await pool.query(
        'SELECT id, title FROM concerns WHERE user_id = ? AND status IN ("Pending", "In Progress") ORDER BY updated_at ASC LIMIT 1',
        [userId]
      );
      if (rows.length > 0) concern = rows[0];
    }

    if (concern) {
      await pool.query('UPDATE concerns SET updated_at = NOW() WHERE id = ?', [concern.id]);
      const reportTitle = concern.title || 'Report';
      return {
        escalated: true,
        concernId: concern.id,
        title: reportTitle,
        message: `⚡ Executive Escalation Ping dispatched to department for "${reportTitle}". Priority flagged for Mayor's Office review.`,
      };
    }
  } catch (err) {
    console.error('[Chatbot AI] Escalation ping error:', err.message);
  }
  return null;
};

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

  // Retrieve past messages for context (last 8)
  const history = await chatbotModel.getMessagesBySession(session.id);
  const recentHistory = history.slice(-8);

  // Fetch live context (user reports or admin city metrics)
  const liveContext = await fetchLiveSessionContext(userId, userRole);
  const mergedContext = { ...contextData, ...liveContext };

  // Choose system prompt based on user role
  const systemPrompt = userRole === 'admin' ? ADMIN_SYSTEM_PROMPT : CITIZEN_SYSTEM_PROMPT;

  // Format prompt
  let prompt = `${systemPrompt}\n\n`;
  if (Object.keys(mergedContext).length > 0) {
    prompt += `LIVE CONTEXT DATA: ${JSON.stringify(mergedContext)}\n\n`;
  }

  prompt += `Conversation History:\n`;
  for (const msg of recentHistory) {
    if (msg.sender === 'user') {
      prompt += `User: ${msg.message}\n`;
    } else {
      prompt += `CitiVoice AI: ${msg.message}\n`;
    }
  }

  prompt += `CitiVoice AI JSON Response:`;

  try {
    let parsed = null;
    try {
      parsed = await generateJSON(prompt);
    } catch (e) {
      const rawText = await generateText(prompt);
      parsed = { message: rawText, action: 'GENERAL_REPLY' };
    }

    if (!parsed || !parsed.message) {
      const fallback = "I'm here to assist you with Kabankalan City services. How can I help you today?";
      await chatbotModel.insertMessage(session.id, 'ai', fallback, null);
      return {
        sessionToken: session.session_token,
        message: fallback,
        action: 'GENERAL_REPLY',
      };
    }

    let actionData = null;

    // Handle ESCALATE_CONCERN intent
    if (parsed.action === 'ESCALATE_CONCERN' || (parsed.escalation && parsed.escalation.concernId)) {
      const targetConcernId = parsed.escalation ? parsed.escalation.concernId : null;
      const escalationResult = await handleEscalationPing(userId, targetConcernId, parsed.escalation?.reason);
      if (escalationResult) {
        actionData = { escalation: escalationResult };
        parsed.message += `\n\n⚡ **Executive Escalation Dispatched**: "${escalationResult.title}" has been prioritized for department evaluation.`;
      }
    }

    // Handle DRAFT_REPORT intent
    if (parsed.action === 'DRAFT_REPORT' && parsed.draft) {
      actionData = { draft: parsed.draft };
    }

    // Save AI response
    await chatbotModel.insertMessage(session.id, 'ai', parsed.message, actionData);

    return {
      sessionToken: session.session_token,
      message: parsed.message,
      action: parsed.action || 'GENERAL_REPLY',
      draft: parsed.draft || null,
      escalation: actionData?.escalation || null,
    };
  } catch (err) {
    console.error('Chatbot AI Error:', err);
    throw new Error('Failed to generate AI response');
  }
};

module.exports = {
  processMessage,
};
