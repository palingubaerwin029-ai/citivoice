/**
 * aiClient.js — AI provider failover for CitiVoice
 *
 * Same interface as groqService (isAvailable, generateText, generateJSON,
 * generateJSONWithImage). Tries each configured provider in order and returns
 * the first usable result, so if one AI is down or rate-limited the next one
 * catches the request.
 *
 * Provider order: Groq (primary) -> Gemini (backup).
 * Override with AI_PROVIDER_ORDER=gemini,groq in .env.
 */

const groqService = require('./groqService');
const geminiService = require('./geminiService');

const PROVIDERS = { groq: groqService, gemini: geminiService };

const getProviders = () => {
  const order = (process.env.AI_PROVIDER_ORDER || 'groq,gemini')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => PROVIDERS[s]);
  return (order.length ? order : ['groq', 'gemini']).map((name) => ({ name, svc: PROVIDERS[name] }));
};

/** True if at least one provider is configured. */
const isAvailable = () => getProviders().some(({ svc }) => svc.isAvailable());

const withFailover = (method) => async (...args) => {
  const providers = getProviders().filter(({ svc }) => svc.isAvailable() && typeof svc[method] === 'function');
  for (let i = 0; i < providers.length; i++) {
    const { name, svc } = providers[i];
    try {
      const result = await svc[method](...args);
      if (result) {
        if (i > 0) console.log(`[AI] ${method} served by backup provider: ${name}`);
        return result;
      }
      console.warn(`[AI] ${name} returned no result for ${method}; trying next provider`);
    } catch (err) {
      console.error(`[AI] ${name} threw on ${method}: ${err.message}; trying next provider`);
    }
  }
  return null;
};

module.exports = {
  isAvailable,
  generateText: withFailover('generateText'),
  generateJSON: withFailover('generateJSON'),
  generateJSONWithImage: withFailover('generateJSONWithImage'),
};

