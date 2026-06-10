const NodeCache = require('node-cache');

// ─── In-memory TTL cache (single-process, zero config) ───────────────────────
const cache = new NodeCache({
  stdTTL: 300, // default: 5 minutes
  checkperiod: 60, // purge expired keys every 60 s
  useClones: false, // return references (faster for read-only JSON)
});

/**
 * Express middleware — serves cached JSON if available, otherwise
 * intercepts res.json() to store the response before sending.
 *
 * @param {string} keyPrefix  Namespace to group related cache entries
 * @param {number} [ttl]      TTL in seconds (falls back to stdTTL)
 */
const cacheMiddleware = (keyPrefix, ttl) => (req, res, next) => {
  // Build a key scoped to the URL + the user's role so admin sees admin data
  const roleTag = req.user ? req.user.role : 'anon';
  const userTag = req.user ? req.user.id : '0';
  const key = `${keyPrefix}:${roleTag}:${userTag}:${req.originalUrl}`;

  const cached = cache.get(key);
  if (cached !== undefined) {
    return res.json(cached);
  }

  // Monkey-patch res.json to intercept the outgoing payload
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    // Only cache successful responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      cache.set(key, body, ttl);
    }
    return originalJson(body);
  };

  next();
};

/**
 * Flush every cache key whose prefix matches.
 * Call this inside POST / PUT / DELETE handlers to bust stale data.
 *
 * @param  {...string} prefixes  One or more key prefixes to purge
 */
const invalidate = (...prefixes) => {
  const keys = cache.keys();
  for (const k of keys) {
    if (prefixes.some((p) => k.startsWith(p))) {
      cache.del(k);
    }
  }
};

module.exports = { cache, cacheMiddleware, invalidate };
