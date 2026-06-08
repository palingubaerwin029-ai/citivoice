/**
 * geminiService.js — Google Gemini AI wrapper for CitiVoice
 * 
 * Provides a unified interface for calling the Gemini API.
 * Gracefully degrades if no GEMINI_API_KEY is set in .env
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
let model = null;

/**
 * Initialize the Gemini client (lazy, once).
 * Returns null if no API key is configured.
 */
const getModel = () => {
  if (model) return model;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return null;
  }
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    console.log('[AI] Gemini model initialized (gemini-2.0-flash)');
    return model;
  } catch (err) {
    console.error('[AI] Failed to initialize Gemini:', err.message);
    return null;
  }
};

/**
 * Check if Gemini is available (API key configured).
 */
const isAvailable = () => {
  return !!getModel();
};

/**
 * Generate text content from a prompt using Gemini.
 * Returns null if Gemini is not available.
 * 
 * @param {string} prompt - The prompt to send to Gemini
 * @param {object} [options] - Optional generation config
 * @returns {Promise<string|null>} - Generated text or null
 */
const generateText = async (prompt, options = {}) => {
  const m = getModel();
  if (!m) return null;

  try {
    const generationConfig = {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 1024,
    };

    const result = await m.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });

    const response = result.response;
    return response.text();
  } catch (err) {
    console.error('[AI] Gemini generation error:', err.message);
    return null;
  }
};

/**
 * Generate a structured JSON response from Gemini.
 * Parses the result as JSON, returns null on failure.
 * 
 * @param {string} prompt - The prompt (should instruct JSON output)
 * @returns {Promise<object|null>}
 */
const generateJSON = async (prompt, options = {}) => {
  const text = await generateText(prompt, { temperature: 0.3, ...options });
  if (!text) return null;

  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[AI] Failed to parse Gemini JSON response:', err.message);
    console.error('[AI] Raw response:', text?.substring(0, 200));
    return null;
  }
};

module.exports = {
  isAvailable,
  generateText,
  generateJSON,
};
