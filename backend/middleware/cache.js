const NodeCache = require('node-cache');
const redisService = require('../services/redisService');

// ─── In-memory TTL cache (fallback when Redis is offline or unconfigured) ──────
const memoryCache = new NodeCache({
  stdTTL: 300, // default: 5 minutes
  checkperiod: 60, // purge expired keys every 60 s
  useClones: false, // return references (faster for read-only JSON)
});

/**
 * Express middleware — serves cached JSON if available (from Redis or in-memory fallback),
 * otherwise intercepts res.json() to store the response before sending.
 *
 * @param {string} keyPrefix  Namespace to group related cache entries
 * @param {number} [ttl]      TTL in seconds (falls back to 300)
 */
const cacheMiddleware = (keyPrefix, ttl = 300) => async (req, res, next) => {
  // Build a key scoped to the URL + role + user so admin sees admin data
  const roleTag = req.user ? req.user.role : 'anon';
  const userTag = req.user ? req.user.id : '0';
  const key = `${keyPrefix}:${roleTag}:${userTag}:${req.originalUrl}`;

  try {
    // 1. Try Redis first if available
    if (redisService.isAvailable()) {
      const redisData = await redisService.get(key);
      if (redisData !== null && redisData !== undefined) {
        return res.json(redisData);
      }
    } else {
      // 2. Fall back to in-memory cache
      const cached = memoryCache.get(key);
      if (cached !== undefined) {
        return res.json(cached);
      }
    }
  } catch (err) {
    console.warn(`[Cache] Error reading cache for "${key}":`, err.message);
  }

  // Monkey-patch res.json to intercept the outgoing payload
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    // Only cache successful responses (2xx)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Save to in-memory fallback
      memoryCache.set(key, body, ttl);

      // Save to Redis if online (non-blocking)
      if (redisService.isAvailable()) {
        redisService.set(key, body, ttl).catch((err) => {
          console.warn(`[Cache] Failed to write key "${key}" to Redis:`, err.message);
        });
      }
    }
    return originalJson(body);
  };

  next();
};

/**
 * Flush every cache key whose prefix matches across both Redis and in-memory cache.
 * Call this inside POST / PUT / DELETE handlers to bust stale data.
 *
 * @param  {...string} prefixes  One or more key prefixes to purge
 */
const invalidate = async (...prefixes) => {
  // 1. Invalidate memory cache
  try {
    const keys = memoryCache.keys();
    for (const k of keys) {
      if (prefixes.some((p) => k.startsWith(p))) {
        memoryCache.del(k);
      }
    }
  } catch (err) {
    console.warn('[Cache] Memory cache invalidation warning:', err.message);
  }

  // 2. Invalidate Redis cache if available
  if (redisService.isAvailable()) {
    try {
      for (const prefix of prefixes) {
        await redisService.delPrefix(prefix);
      }
    } catch (err) {
      console.warn('[Cache] Redis cache invalidation warning:', err.message);
    }
  }
};

module.exports = {
  cache: memoryCache,
  cacheMiddleware,
  invalidate,
};
