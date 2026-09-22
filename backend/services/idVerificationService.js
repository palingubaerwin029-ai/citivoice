/**
 * idVerificationService.js — AI-powered ID Name Verification
 *
 * Uses Groq Vision AI to extract the full name from a government ID photo,
 * then fuzzy-matches it against the name the user typed during registration.
 */

const path = require('path');
const fs = require('fs');
const groqService = require('./groqService');

// ── Name Normalization ───────────────────────────────────────────────────────

/**
 * Normalize a name for comparison:
 * - Lowercase
 * - Remove suffixes (Jr., Sr., III, IV, etc.)
 * - Remove extra whitespace
 * - Remove special characters except spaces
 */
function normalizeName(name) {
  if (!name) return '';
  let n = name.toLowerCase().trim();
  // Remove common suffixes
  n = n.replace(/\b(jr\.?|sr\.?|iii|iv|ii|v)\b/gi, '');
  // Remove special characters except letters and spaces
  n = n.replace(/[^a-záàâãéèêíïóôõöúçñ\s]/gi, '');
  // Collapse multiple spaces
  n = n.replace(/\s+/g, ' ').trim();
  return n;
}

/**
 * Split a full name into individual name tokens.
 */
function nameTokens(name) {
  return normalizeName(name).split(' ').filter(Boolean);
}

/**
 * Calculate Levenshtein distance between two strings.
 */
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Calculate similarity between two strings (0 to 100).
 */
function stringSimilarity(a, b) {
  if (!a && !b) return 100;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  const dist = levenshtein(a, b);
  return Math.round((1 - dist / maxLen) * 100);
}

// ── Fuzzy Name Matching ──────────────────────────────────────────────────────

/**
 * Compare two full names with fuzzy matching.
 * Handles:
 * - Different ordering (e.g., "Cruz, Juan dela" vs "Juan dela Cruz")
 * - Middle name included/excluded
 * - Minor typos
 *
 * @param {string} typedName - The name the user typed
 * @param {string} extractedName - The name extracted from the ID
 * @returns {{ match: boolean, confidence: number, reason: string }}
 */
function compareNames(typedName, extractedName) {
  const normTyped = normalizeName(typedName);
  const normExtracted = normalizeName(extractedName);

  // Exact match after normalization
  if (normTyped === normExtracted) {
    return { match: true, confidence: 100, reason: 'Exact match' };
  }

  // Full string similarity
  const fullSimilarity = stringSimilarity(normTyped, normExtracted);
  if (fullSimilarity >= 85) {
    return { match: true, confidence: fullSimilarity, reason: 'High similarity match' };
  }

  // Token-based matching (handles name order differences & middle names)
  const typedTokens = nameTokens(typedName);
  const extractedTokens = nameTokens(extractedName);

  if (typedTokens.length === 0 || extractedTokens.length === 0) {
    return { match: false, confidence: 0, reason: 'Could not parse names' };
  }

  // Count how many typed tokens match an extracted token (fuzzy)
  let matchedCount = 0;
  const usedExtracted = new Set();

  for (const tToken of typedTokens) {
    let bestMatchIdx = -1;
    let bestSim = 0;

    for (let i = 0; i < extractedTokens.length; i++) {
      if (usedExtracted.has(i)) continue;
      const sim = stringSimilarity(tToken, extractedTokens[i]);
      if (sim > bestSim) {
        bestSim = sim;
        bestMatchIdx = i;
      }
    }

    if (bestSim >= 75 && bestMatchIdx >= 0) {
      matchedCount++;
      usedExtracted.add(bestMatchIdx);
    }
  }

  // Calculate confidence based on token matching
  const maxTokens = Math.max(typedTokens.length, extractedTokens.length);
  const minTokens = Math.min(typedTokens.length, extractedTokens.length);
  const tokenConfidence = Math.round((matchedCount / maxTokens) * 100);

  // If user typed fewer tokens (e.g., omitted middle name), be more lenient
  const leniency = matchedCount >= minTokens && matchedCount >= 2;

  if (tokenConfidence >= 70 || (leniency && matchedCount >= 2)) {
    const finalConfidence = Math.max(tokenConfidence, fullSimilarity);
    return {
      match: finalConfidence >= 70,
      confidence: finalConfidence,
      reason: leniency
        ? 'Core name tokens match (middle name may differ)'
        : 'Token-based fuzzy match',
    };
  }

  return {
    match: false,
    confidence: Math.max(tokenConfidence, fullSimilarity),
    reason: 'Name does not match the ID',
  };
}

// ── Groq Vision AI Extraction ────────────────────────────────────────────────

const EXTRACTION_PROMPT = `You are analyzing a Philippine government ID card image. Your task is to extract the FULL NAME of the person shown on this ID.

Rules:
- Extract the complete full name exactly as printed on the ID
- Include first name, middle name (if present), and last name
- If the name uses "LAST NAME, FIRST NAME MIDDLE NAME" format, reorder it to "FIRST NAME MIDDLE NAME LAST NAME"
- Do NOT include titles (Mr., Mrs., Dr.) or ID numbers
- If you cannot read the name clearly, set "readable" to false

Return a JSON object with this exact structure:
{
  "fullName": "the extracted full name",
  "readable": true,
  "confidence": "high" | "medium" | "low"
}`;

/**
 * Extract the name from an ID image using Groq Vision AI.
 *
 * @param {string} imagePath - Absolute path to the ID image file
 * @returns {Promise<{ fullName: string|null, readable: boolean, confidence: string }>}
 */
async function extractNameWithGroq(imagePath) {
  try {
    if (!groqService.isAvailable()) {
      console.log('[ID Verify] Groq not available, skipping vision extraction');
      return null;
    }

    console.log('[ID Verify] Extracting name via Groq Vision AI...');
    const result = await groqService.generateJSONWithImage(EXTRACTION_PROMPT, imagePath, {
      temperature: 0.1,
      maxTokens: 256,
    });

    if (!result || !result.fullName) {
      console.log('[ID Verify] Groq Vision returned no name');
      return null;
    }

    console.log(`[ID Verify] Groq extracted name: "${result.fullName}" (confidence: ${result.confidence})`);
    return result;
  } catch (err) {
    console.error('[ID Verify] Groq Vision extraction error:', err.message);
    return null;
  }
}


// ── Main Verification Function ───────────────────────────────────────────────

/**
 * Verify that the name typed by the user matches the name on their uploaded ID.
 *
 * @param {string} imagePath - Absolute path to the uploaded ID image
 * @param {string} typedName - The name the user typed in the registration form
 * @returns {Promise<{ match: boolean, confidence: number, extractedName: string|null, reason: string, method: string }>}
 */
async function verifyNameOnId(imagePath, typedName) {
  if (!typedName || !typedName.trim()) {
    return {
      match: false,
      confidence: 0,
      extractedName: null,
      reason: 'No name provided',
      method: 'none',
    };
  }

  if (!imagePath || !fs.existsSync(imagePath)) {
    return {
      match: false,
      confidence: 0,
      extractedName: null,
      reason: 'ID image not found',
      method: 'none',
    };
  }

  // Extract name using Groq Vision AI
  let extractedName = null;
  const method = 'groq_vision';

  const groqResult = await extractNameWithGroq(imagePath);
  if (groqResult && groqResult.fullName && groqResult.readable !== false) {
    extractedName = groqResult.fullName;
  }

  // If AI could not extract a name
  if (!extractedName) {
    return {
      match: false,
      confidence: 0,
      extractedName: null,
      reason: 'Could not read the name from the ID. Please upload a clearer photo.',
      method,
    };
  }

  // Compare the names
  const comparison = compareNames(typedName, extractedName);

  return {
    match: comparison.match,
    confidence: comparison.confidence,
    extractedName,
    reason: comparison.reason,
    method,
  };
}

module.exports = {
  verifyNameOnId,
  compareNames,
  normalizeName,
};
