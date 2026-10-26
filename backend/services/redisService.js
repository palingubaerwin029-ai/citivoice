const Redis = require('ioredis');

const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true' ||
  Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);

let client = null;
let isConnected = false;

if (REDIS_ENABLED) {
  try {
    const redisConfig = process.env.REDIS_URL
      ? process.env.REDIS_URL
      : {
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: parseInt(process.env.REDIS_PORT, 10) || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
          lazyConnect: true,
          connectTimeout: 5000,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          retryStrategy(times) {
            // Reconnect backoff with max 10s delay, stop attempting after 10 tries if unavailable
            if (times > 10) {
              console.warn('[Redis] Max reconnection attempts reached. Redis remains offline.');
              return null;
            }
            return Math.min(times * 500, 10000);
          },
        };

    client = new Redis(redisConfig, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    client.on('connect', () => {
      console.log('⚡ [Redis] Connected successfully');
      isConnected = true;
    });

    client.on('ready', () => {
      isConnected = true;
    });

    client.on('error', (err) => {
      isConnected = false;
      // Log connection error without crashing the process
      console.warn(`⚠️ [Redis] Connection warning: ${err.message}`);
    });

    client.on('close', () => {
      isConnected = false;
    });

    // Initiate non-blocking connection
    client.connect().catch((err) => {
      isConnected = false;
      console.warn(`⚠️ [Redis] Could not connect to Redis server (${err.message}). In-memory fallback will be active.`);
    });
  } catch (err) {
    console.warn(`⚠️ [Redis] Initialization failed: ${err.message}`);
    client = null;
    isConnected = false;
  }
} else {
  console.log('ℹ️ [Redis] REDIS_URL/REDIS_HOST not configured. Operating with in-memory caching.');
}

/**
 * Check if Redis is currently connected and ready.
 */
const isAvailable = () => {
  return isConnected && client && client.status === 'ready';
};

/**
 * Test Redis connectivity via PING.
 * Returns true if successful, false otherwise.
 */
const ping = async () => {
  if (!isAvailable()) return false;
  try {
    const res = await client.ping();
    return res === 'PONG';
  } catch (_) {
    return false;
  }
};

/**
 * Get item from Redis and parse JSON if applicable.
 */
const get = async (key) => {
  if (!isAvailable()) return null;
  try {
    const data = await client.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (_) {
      return data;
    }
  } catch (err) {
    console.warn(`[Redis] Get failed for key "${key}":`, err.message);
    return null;
  }
};

/**
 * Set item in Redis with an optional TTL in seconds.
 */
const set = async (key, value, ttlSeconds = 300) => {
  if (!isAvailable()) return false;
  try {
    const payload = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await client.set(key, payload, 'EX', ttlSeconds);
    } else {
      await client.set(key, payload);
    }
    return true;
  } catch (err) {
    console.warn(`[Redis] Set failed for key "${key}":`, err.message);
    return false;
  }
};

/**
 * Delete a specific key from Redis.
 */
const del = async (key) => {
  if (!isAvailable()) return false;
  try {
    await client.del(key);
    return true;
  } catch (err) {
    console.warn(`[Redis] Del failed for key "${key}":`, err.message);
    return false;
  }
};

/**
 * Delete all keys matching a specific prefix (e.g. "concerns:*").
 * Uses SCAN to avoid blocking Redis single-threaded event loop.
 */
const delPrefix = async (prefix) => {
  if (!isAvailable()) return false;
  try {
    const pattern = prefix.endsWith('*') ? prefix : `${prefix}*`;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys && keys.length > 0) {
        await client.unlink(...keys);
      }
    } while (cursor !== '0');
    return true;
  } catch (err) {
    console.warn(`[Redis] DelPrefix failed for prefix "${prefix}":`, err.message);
    return false;
  }
};

module.exports = {
  client,
  isAvailable,
  ping,
  get,
  set,
  del,
  delPrefix,
};
