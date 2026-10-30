/**
 * geminiService.js — Google Gemini wrapper for CitiVoice (backup AI provider)
 *
 * Mirrors the groqService interface so aiClient.js can fail over to it.
 * Uses the REST API directly (no extra dependency). Gracefully unavailable
 * if no GEMINI_API_KEY is set in .env.
 */

const path = require('path');
const { fileToBase64Url } = require('./groqService');

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.0-flash';

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_key_here' || key === 'your_gemini_api_key_here') return null;
  return key;
};

const isAvailable = () => !!getApiKey();

const callGemini = async (parts, { temperature = 0.7, maxTokens = 1024, json = false, model } = {}) => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const modelName = model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      ...(json ? { responseMimeType: 'application/json' } : {}),
    },
  };

  try {
    const res = await fetch(`${API_BASE}/${modelName}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(parseInt(process.env.GEMINI_TIMEOUT_MS, 10) || 30000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[AI] Gemini HTTP ${res.status}:`, errText.slice(0, 300));
      return null;
    }

    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || '')
      .join('')
      .trim();
    return text || null;
  } catch (err) {
    console.error('[AI] Gemini request error:', err.message);
    return null;
  }
};

const parseJsonObject = (text) => {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0].trim());
  } catch (err) {
    console.error('[AI] Failed to parse Gemini JSON response:', err.message);
    return null;
  }
};

const generateText = async (prompt, options = {}) =>
  callGemini([{ text: prompt }], {
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens ?? 1024,
  });

const generateJSON = async (prompt, options = {}) => {
  const text = await callGemini([{ text: `${prompt}\n\nRespond strictly in valid JSON.` }], {
    temperature: options.temperature ?? 0.3,
    maxTokens: options.maxTokens ?? 1024,
    json: true,
  });
  return parseJsonObject(text);
};

const generateJSONWithImage = async (prompt, imagePath, options = {}) => {
  if (!getApiKey()) return null;
  try {
    const ext = path.extname(imagePath).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.webp') mimeType = 'image/webp';

    const dataUrl = await fileToBase64Url(imagePath, mimeType);
    const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) return null;

    const text = await callGemini(
      [
        { text: `${prompt}\n\nRespond strictly in valid JSON.` },
        { inline_data: { mime_type: m[1], data: m[2] } },
      ],
      {
        temperature: options.temperature ?? 0.3,
        maxTokens: options.maxTokens ?? 1024,
        json: true,
      }
    );
    return parseJsonObject(text);
  } catch (err) {
    console.error('[AI] Gemini vision error:', err.message);
    return null;
  }
};

module.exports = {
  isAvailable,
  generateText,
  generateJSON,
  generateJSONWithImage,
};

