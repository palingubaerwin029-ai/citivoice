/**
 * groqService.js — Groq AI wrapper for CitiVoice
 *
 * Provides a unified interface for calling the Groq API (Llama 3).
 * Gracefully degrades if no GROQ_API_KEY is set in .env
 */

const Groq = require('groq-sdk');
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

// Limit Groq API calls to 3 concurrent requests to avoid rate limits
const aiQueue = new TaskQueue(3);

let groqClient = null;

/**
 * Initialize the Groq client (lazy, once).
 * Returns null if no API key is configured.
 */
const getClient = () => {
  if (groqClient) return groqClient;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    return null;
  }
  try {
    groqClient = new Groq({ apiKey });
    console.log('[AI] Groq client initialized (llama3-8b-8192)');
    return groqClient;
  } catch (err) {
    console.error('[AI] Failed to initialize Groq:', err.message);
    return null;
  }
};

/**
 * Check if Groq is available (API key configured).
 */
const isAvailable = () => {
  return !!getClient();
};

/**
 * Generate text content from a prompt using Groq (Llama 3).
 * Returns null if Groq is not available.
 *
 * @param {string} prompt - The prompt to send to Groq
 * @param {object} [options] - Optional generation config
 * @returns {Promise<string|null>} - Generated text or null
 */
const generateText = async (prompt, options = {}) => {
  return aiQueue.enqueue(async () => {
    const client = getClient();
    if (!client) {
      console.error('[AI] Groq client not available. GROQ_API_KEY set:', !!process.env.GROQ_API_KEY);
      return null;
    }

    try {
      const result = await client.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1024,
      });

      return result.choices[0]?.message?.content || null;
    } catch (err) {
      console.error('[AI] Groq generation error:', err.message);
      return null;
    }
  });
};

/**
 * Generate a structured JSON response from Groq.
 * Parses the result as JSON, returns null on failure.
 *
 * @param {string} prompt - The prompt (should instruct JSON output)
 * @returns {Promise<object|null>}
 */
const generateJSON = async (prompt, options = {}) => {
  // We can enforce JSON mode with response_format, but Groq requires the prompt to include "JSON".
  return aiQueue.enqueue(async () => {
    const client = getClient();
    if (!client) return null;

    try {
      const result = await client.chat.completions.create({
        messages: [{ role: 'user', content: prompt + "\n\nRespond strictly in valid JSON." }],
        model: 'llama-3.3-70b-versatile',
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 1024,
        response_format: { type: 'json_object' }
      });

      const text = result.choices[0]?.message?.content;
      if (!text) return null;

      const cleaned = text
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      return JSON.parse(cleaned);
    } catch (err) {
      console.error('[AI] Failed to parse Groq JSON response:', err.message);
      return null;
    }
  });
};

/**
 * Helper to convert a local file to base64 URL format for vision models
 */
function fileToBase64Url(filePath, mimeType) {
  const data = Buffer.from(fs.readFileSync(filePath)).toString('base64');
  return `data:${mimeType};base64,${data}`;
}

/**
 * Generate a structured JSON response from Groq using an image and text prompt.
 * Parses the result as JSON, returns null on failure.
 *
 * @param {string} prompt - The prompt (should instruct JSON output)
 * @param {string} imagePath - Absolute path to the local image
 * @returns {Promise<object|null>}
 */
const generateJSONWithImage = async (prompt, imagePath, options = {}) => {
  return aiQueue.enqueue(async () => {
    const client = getClient();
    if (!client) return null;

    try {
      const ext = path.extname(imagePath).toLowerCase();
      let mimeType = 'image/jpeg';
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.webp') mimeType = 'image/webp';
      
      const imageUrl = fileToBase64Url(imagePath, mimeType);

      const result = await client.chat.completions.create({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt + "\n\nRespond strictly in valid JSON." },
              {
                type: "image_url",
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        model: 'llama-3.2-11b-vision-preview',
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 1024,
        // response_format: { type: 'json_object' } // Groq vision doesn't strictly support json_object mode, but we parse it anyway
      });

      const text = result.choices[0]?.message?.content;
      if (!text) return null;

      const cleaned = text
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      return JSON.parse(cleaned);
    } catch (err) {
      console.error('[AI] Failed to parse Groq Vision JSON response:', err.message);
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
