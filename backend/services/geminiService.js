/**
 * geminiService.js — Google Gemini AI wrapper for CitiVoice
 *
 * Provides a unified interface for calling the Gemini API.
 * Gracefully degrades if no GEMINI_API_KEY is set in .env
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

class TaskQueue {
  constructor(concurrency) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  async enqueue(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processNext();
    });
  }

  async processNext() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }
    this.running++;
    const { task, resolve, reject } = this.queue.shift();
    try {
      const result = await task();
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      this.running--;
      this.processNext();
    }
  }
}

// Limit Gemini API calls to 3 concurrent requests to avoid rate limits
const aiQueue = new TaskQueue(3);

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
  return aiQueue.enqueue(async () => {
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
  });
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
    const cleaned = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[AI] Failed to parse Gemini JSON response:', err.message);
    console.error('[AI] Raw response:', text?.substring(0, 200));
    return null;
  }
};

/**
 * Helper to convert a local file to the Generative Part format.
 */
function fileToGenerativePart(filePath, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString('base64'),
      mimeType,
    },
  };
}

/**
 * Generate a structured JSON response from Gemini using an image and text prompt.
 * Parses the result as JSON, returns null on failure.
 *
 * @param {string} prompt - The prompt (should instruct JSON output)
 * @param {string} imagePath - Absolute path to the local image
 * @returns {Promise<object|null>}
 */
const generateJSONWithImage = async (prompt, imagePath, options = {}) => {
  return aiQueue.enqueue(async () => {
    const m = getModel();
    if (!m) return null;

    try {
      const generationConfig = {
        temperature: options.temperature ?? 0.3,
        maxOutputTokens: options.maxTokens ?? 1024,
      };

      // Determine mimeType simply by extension
      const ext = path.extname(imagePath).toLowerCase();
      let mimeType = 'image/jpeg';
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.heic') mimeType = 'image/heic';

      const imagePart = fileToGenerativePart(imagePath, mimeType);

      const result = await m.generateContent({
        contents: [{ role: 'user', parts: [imagePart, { text: prompt }] }],
        generationConfig,
      });

      const text = result.response.text();
      
      // Strip markdown code fences if present
      const cleaned = text
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      return JSON.parse(cleaned);
    } catch (err) {
      console.error('[AI] Failed to parse Gemini Vision JSON response:', err.message);
      return null;
    }
  });
};

module.exports = {
  isAvailable,
  generateText,
  generateJSON,
  generateJSONWithImage,
};
