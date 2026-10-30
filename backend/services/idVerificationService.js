/**
 * idVerificationService.js — AI-powered ID Name Verification
 *
 * Uses Groq Vision AI to extract the full name from a government ID photo,
 * then fuzzy-matches it against the name the user typed during registration.
 */

const path = require('path');
const fs = require('fs');
const groqService = require('./aiClient'); // Groq primary with Gemini failover

// ── In-Memory Extraction Cache (Instant 0ms on repeated checks/registration) ──
const idExtractionCache = new Map();
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

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
  // Replace hyphens and dashes with spaces so hyphenated names match spaced tokens
  n = n.replace(/[-–—]/g, ' ');
  // Remove special characters except letters, accents, ñ, and spaces
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

  // Exact match with enye/plain-n tolerance (in case OCR extracted 'N' instead of 'Ñ' or vice versa)
  if (normTyped.replace(/ñ/g, 'n') === normExtracted.replace(/ñ/g, 'n')) {
    return { match: true, confidence: 99, reason: 'Exact match (Ñ/N accent variance handled)' };
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
  const tokenConfidence = Math.round((matchedCount / maxTokens) * 100);

  // If user typed fewer tokens (e.g. omitted middle name), and all typed tokens match ID
  const leniency = matchedCount >= typedTokens.length && matchedCount >= 2;

  if (tokenConfidence >= 70 || leniency) {
    const finalConfidence = leniency ? Math.max(tokenConfidence, 92) : Math.max(tokenConfidence, fullSimilarity);
    return {
      match: true,
      confidence: Math.min(100, finalConfidence),
      reason: leniency
        ? 'Core name tokens match (first and last name verified)'
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

const EXTRACTION_PROMPT = `You are an expert OCR and identity document analyzer for Philippine government-issued IDs.
Analyze this government ID card image carefully. Your task is to extract:
1. "fullName": The cardholder's complete legal full name. Reorder to "FIRST NAME MIDDLE NAME LAST NAME" if formatted as "LAST NAME, FIRST NAME MIDDLE NAME". Do NOT include titles (Mr., Mrs., Hon., Dr., Engr.). Accurately preserve Philippine special characters such as 'Ñ'/'ñ' and hyphens/dashes if present.
2. "idNumber": The official card number or identification number printed on the ID (e.g. PhilSys Card Number, Driver's License Number, SSS/UMID CRN, Passport Number, PhilHealth Number, TIN, Postal ID PRN, Voter's VIN, PRC License Number). Keep all digits, letters, and separators exactly as printed.
3. "idType": The specific Philippine ID type detected (e.g. "PhilSys (National ID)", "Driver's License", "Philippine Passport", "SSS ID", "GSIS ID", "PhilHealth ID", "TIN ID", "Postal ID", "Voter's ID", "PRC ID", "Barangay ID", "Senior Citizen / PWD ID").
4. "readable": true if the text can be read, false if too blurry, cropped, glare-heavy, or unreadable.

Return a JSON object with this exact structure:
{
  "fullName": "extracted full name or null",
  "idNumber": "extracted ID number or null",
  "idType": "identified ID type or null",
  "readable": true,
  "confidence": "high" | "medium" | "low"
}`;

/**
 * Extract name, ID number, and ID type using Groq Vision AI.
 *
 * @param {string} imagePath - Absolute path to the ID image file
 * @returns {Promise<{ fullName: string|null, idNumber: string|null, idType: string|null, readable: boolean, confidence: string }>}
 */
async function extractIdDetailsWithGroq(imagePath) {
  try {
    let cacheKey = imagePath;
    try {
      const stats = fs.statSync(imagePath);
      cacheKey = `${imagePath}:${stats.size}:${stats.mtimeMs}`;
    } catch (_) {}

    const cached = idExtractionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log(`[ID Verify] Cache HIT for "${path.basename(imagePath)}", returning instantly (0ms).`);
      return cached.result;
    }

    if (!groqService.isAvailable()) {
      console.log('[ID Verify] Groq not available, skipping vision extraction');
      return null;
    }

    console.log('[ID Verify] Extracting ID card details via Groq Vision AI...');
    const result = await groqService.generateJSONWithImage(EXTRACTION_PROMPT, imagePath, {
      temperature: 0.1,
      maxTokens: 220, // Compact response with only essential card fields
    });

    if (!result) {
      console.log('[ID Verify] Groq Vision returned empty result');
      return null;
    }

    // Cache the successful extraction
    idExtractionCache.set(cacheKey, { result, timestamp: Date.now() });

    console.log(
      `[ID Verify] Groq extracted -> Name: "${result.fullName}", ID#: "${result.idNumber}", Type: "${result.idType}" (confidence: ${result.confidence})`
    );
    return result;
  } catch (err) {
    console.error('[ID Verify] Groq Vision extraction error:', err.message);
    return null;
  }
}

// ── ID Number Normalization & Fuzzy Matching ─────────────────────────────────

/**
 * Normalize an ID number by stripping non-alphanumeric characters and uppercasing.
 */
function normalizeIdNumber(num) {
  if (!num) return '';
  return String(num).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Compare two ID numbers with OCR error tolerance.
 */
function compareIdNumbers(typedId, extractedId) {
  const normTyped = normalizeIdNumber(typedId);
  const normExtracted = normalizeIdNumber(extractedId);

  if (!normTyped && !normExtracted) {
    return { match: true, confidence: 100, reason: 'No ID number specified' };
  }
  if (!normTyped || !normExtracted) {
    return { match: false, confidence: 0, reason: 'ID number missing' };
  }

  // Exact match
  if (normTyped === normExtracted) {
    return { match: true, confidence: 100, reason: 'Exact ID number match' };
  }

  // Handle common OCR substitutions (O/0, I/1, S/5, B/8, Z/2)
  const replaceConfusable = (s) =>
    s.replace(/O/g, '0').replace(/I/g, '1').replace(/S/g, '5').replace(/B/g, '8').replace(/Z/g, '2');

  if (replaceConfusable(normTyped) === replaceConfusable(normExtracted)) {
    return { match: true, confidence: 95, reason: 'Matched with OCR character tolerance' };
  }

  // Substring matching (handles leading/trailing check digits or prefix differences)
  if (normTyped.includes(normExtracted) || normExtracted.includes(normTyped)) {
    const minLen = Math.min(normTyped.length, normExtracted.length);
    if (minLen >= 6) {
      return { match: true, confidence: 88, reason: 'Core ID number sequence matches' };
    }
  }

  const sim = stringSimilarity(normTyped, normExtracted);
  return {
    match: sim >= 80,
    confidence: sim,
    reason: sim >= 80 ? 'High similarity ID number match' : 'ID number does not match card',
  };
}

// ── Main Verification Functions ──────────────────────────────────────────────

/**
 * Verify both the name and ID number from an uploaded ID card against user input.
 *
 * @param {string} imagePath - Absolute path to uploaded ID image
 * @param {string} typedName - The name the user typed
 * @param {string} [typedIdNumber] - The ID number the user typed
 * @param {string} [typedIdType] - The selected ID type
 * @returns {Promise<{
 *   match: boolean,
 *   nameMatch: boolean,
 *   numberMatch: boolean,
 *   confidence: number,
 *   extractedName: string|null,
 *   extractedIdNumber: string|null,
 *   detectedIdType: string|null,
 *   reason: string,
 *   method: string
 * }>}
 */
async function verifyIdCard(imagePath, typedName = '', typedIdNumber = '', typedIdType = '') {
  if (!imagePath || !fs.existsSync(imagePath)) {
    return {
      match: false,
      nameMatch: false,
      numberMatch: false,
      confidence: 0,
      extractedName: null,
      extractedIdNumber: null,
      detectedIdType: null,
      reason: 'ID image not found on server.',
      method: 'none',
    };
  }

  const groqResult = await extractIdDetailsWithGroq(imagePath);
  const extractedName = groqResult?.fullName || null;
  const extractedIdNumber = groqResult?.idNumber || null;
  const detectedIdType = groqResult?.idType || null;

  if (!extractedName && !extractedIdNumber) {
    return {
      match: false,
      nameMatch: false,
      numberMatch: false,
      confidence: 0,
      extractedName: null,
      extractedIdNumber: null,
      detectedIdType,
      reason: 'Could not clearly read the details from the ID. Please upload a clearer, well-lit photo.',
      method: 'groq_vision',
    };
  }

  const hasNameInput = Boolean(typedName?.trim());
  const hasNumInput = Boolean(typedIdNumber?.trim());

  // Compare name
  const nameComp = hasNameInput
    ? compareNames(typedName.trim(), extractedName || '')
    : { match: Boolean(extractedName), confidence: extractedName ? 95 : 0, reason: extractedName ? 'Scanned name from ID' : 'No name on card' };

  // Compare ID number if typed
  const numComp = hasNumInput
    ? compareIdNumbers(typedIdNumber.trim(), extractedIdNumber || '')
    : { match: Boolean(extractedIdNumber), confidence: extractedIdNumber ? 95 : 0, reason: extractedIdNumber ? 'Scanned ID number from ID' : 'No ID number on card' };

  let overallMatch = true;
  if (hasNameInput && !nameComp.match) overallMatch = false;
  if (hasNumInput && !numComp.match) overallMatch = false;

  let reason = 'ID details successfully scanned.';
  if (hasNameInput && hasNumInput) {
    if (nameComp.match && numComp.match) {
      reason = 'Both your name and ID number match the card.';
    } else if (!nameComp.match && !numComp.match) {
      reason = `Name ("${extractedName}") and ID number ("${extractedIdNumber}") on card differ from input.`;
    } else if (!nameComp.match) {
      reason = `Name on card ("${extractedName}") does not match your entered name.`;
    } else {
      reason = `ID number on card ("${extractedIdNumber}") does not match your entered ID number.`;
    }
  } else if (hasNameInput && !nameComp.match) {
    reason = `Name on card ("${extractedName}") does not match your entered name.`;
  } else if (hasNumInput && !numComp.match) {
    reason = `ID number on card ("${extractedIdNumber}") does not match your entered ID number.`;
  }

  let totalConf = 0;
  let itemsCount = 0;
  if (hasNameInput) {
    totalConf += nameComp.confidence;
    itemsCount++;
  } else if (extractedName) {
    totalConf += 95;
    itemsCount++;
  }
  if (hasNumInput) {
    totalConf += numComp.confidence;
    itemsCount++;
  } else if (extractedIdNumber) {
    totalConf += 95;
    itemsCount++;
  }
  const confidence = itemsCount > 0 ? Math.min(100, Math.round(totalConf / itemsCount)) : 90;

  return {
    match: overallMatch,
    nameMatch: nameComp.match,
    numberMatch: numComp.match,
    confidence,
    extractedName,
    extractedIdNumber,
    detectedIdType,
    reason,
    method: 'groq_vision',
  };
}

/**
 * Backward-compatible helper for verifying only the name.
 */
async function verifyNameOnId(imagePath, typedName) {
  const res = await verifyIdCard(imagePath, typedName, '', '');
  return {
    match: res.nameMatch,
    confidence: res.confidence,
    extractedName: res.extractedName,
    extractedIdNumber: res.extractedIdNumber,
    detectedIdType: res.detectedIdType,
    reason: res.reason,
    method: res.method,
  };
}

module.exports = {
  verifyIdCard,
  verifyNameOnId,
  compareNames,
  compareIdNumbers,
  normalizeName,
  normalizeIdNumber,
  extractIdDetailsWithGroq,
};
