/**
 * similarityService.js — Duplicate/Similar Concern Detection
 * 
 * Uses TF-IDF (via `natural`) for text similarity and Haversine
 * formula for GPS proximity to find related concerns.
 */

const natural = require('natural');
const TfIdf = natural.TfIdf;

/**
 * Calculate Haversine distance between two GPS coordinates in meters.
 */
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculate cosine similarity between two TF-IDF vectors.
 */
const cosineSimilarity = (vecA, vecB) => {
  const allTerms = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (const term of allTerms) {
    const a = vecA[term] || 0;
    const b = vecB[term] || 0;
    dotProduct += a * b;
    magA += a * a;
    magB += b * b;
  }

  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
};

/**
 * Find concerns similar to the given target concern.
 * 
 * @param {object} targetConcern - The concern to compare against
 * @param {object[]} allConcerns - All existing concerns to search
 * @param {object} [options] - Configuration options
 * @param {number} [options.textThreshold=0.35] - Minimum text similarity (0-1)
 * @param {number} [options.geoRadius=300] - Max distance in meters for geo match
 * @param {number} [options.maxResults=5] - Max similar concerns to return
 * @returns {object[]} Array of { concern, textScore, geoScore, combinedScore, matchType }
 */
const findSimilarConcerns = (targetConcern, allConcerns, options = {}) => {
  const {
    textThreshold = 0.35,
    geoRadius = 300,
    maxResults = 5,
  } = options;

  // Exclude the target concern itself
  const candidates = allConcerns.filter(c => c.id !== targetConcern.id);
  if (candidates.length === 0) return [];

  // Build TF-IDF corpus
  const tfidf = new TfIdf();
  const targetText = `${targetConcern.title} ${targetConcern.description}`.toLowerCase();
  tfidf.addDocument(targetText);

  candidates.forEach(c => {
    tfidf.addDocument(`${c.title} ${c.description}`.toLowerCase());
  });

  // Extract TF-IDF vector for target document
  const getVector = (docIndex) => {
    const vec = {};
    tfidf.listTerms(docIndex).forEach(item => {
      vec[item.term] = item.tfidf;
    });
    return vec;
  };

  const targetVec = getVector(0);

  // Score each candidate
  const results = candidates.map((c, i) => {
    const candidateVec = getVector(i + 1);
    const textScore = cosineSimilarity(targetVec, candidateVec);

    // Geo proximity score
    let geoScore = 0;
    if (
      targetConcern.location_lat && targetConcern.location_lng &&
      c.location_lat && c.location_lng
    ) {
      const distance = haversineDistance(
        parseFloat(targetConcern.location_lat), parseFloat(targetConcern.location_lng),
        parseFloat(c.location_lat), parseFloat(c.location_lng)
      );
      if (distance <= geoRadius) {
        geoScore = 1 - (distance / geoRadius); // 1.0 = same spot, 0.0 = at radius edge
      }
    }

    // Category match bonus
    const categoryBonus = c.category === targetConcern.category ? 0.15 : 0;

    // Combined score (weighted)
    const combinedScore = (textScore * 0.6) + (geoScore * 0.25) + (categoryBonus * 0.15);

    // Determine match type
    let matchType = 'related';
    if (textScore >= 0.6 && geoScore >= 0.5) matchType = 'duplicate';
    else if (textScore >= 0.7) matchType = 'duplicate';

    return {
      concern: c,
      textScore: Math.round(textScore * 100),
      geoScore: Math.round(geoScore * 100),
      combinedScore: Math.round(combinedScore * 100),
      matchType,
    };
  });

  // Filter and sort
  return results
    .filter(r => r.combinedScore >= Math.round(textThreshold * 100))
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, maxResults);
};

module.exports = {
  findSimilarConcerns,
  haversineDistance,
};
