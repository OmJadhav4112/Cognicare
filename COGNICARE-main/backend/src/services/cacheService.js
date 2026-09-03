/**
 * Cache Service for DementiaCare+
 * 
 * Provides Redis-based caching with fallback to in-memory store
 * Used for expensive operations like AI recommendations
 * Supports TTL, warm-up jobs, and cache invalidation
 */

let redis = null;
let useRedis = false;

// Initialize Redis client if available
try {
  const redisModule = require('redis');
  if (process.env.REDIS_URL) {
    redis = redisModule.createClient({ url: process.env.REDIS_URL });
    redis.on('error', (err) => {
      console.warn('Redis cache error:', err.message);
      useRedis = false;
    });
    redis.on('connect', () => {
      console.log('✓ Redis cache connected');
      useRedis = true;
    });
    redis.connect().catch(() => {
      console.warn('Redis cache unavailable, using in-memory fallback');
      useRedis = false;
    });
  }
} catch (err) {
  console.warn('Redis module not available, using in-memory cache:', err.message);
}

// In-memory cache fallback
const inMemoryCache = new Map();

/**
 * Generate cache key
 */
const getCacheKey = (type, userId, ...args) => {
  const suffix = args.length > 0 ? `:${args.join(':')}` : '';
  return `cache:${type}:${userId}${suffix}`;
};

/**
 * Get value from cache
 * @param {string} type - Cache type identifier (e.g., 'ai:recommendations')
 * @param {string} userId - Patient/User ID
 * @returns {Promise<any>} Cached value or null
 */
const get = async (type, userId, ...args) => {
  try {
    const key = getCacheKey(type, userId, ...args);
    
    if (useRedis && redis) {
      const data = await redis.get(key);
      if (data) {
        console.log(`[Cache HIT] ${key}`);
        return JSON.parse(data);
      }
    } else {
      const data = inMemoryCache.get(key);
      if (data && data.expiresAt > Date.now()) {
        console.log(`[Cache HIT] ${key}`);
        return data.value;
      }
      if (data) {
        inMemoryCache.delete(key);
      }
    }
    
    console.log(`[Cache MISS] ${key}`);
    return null;
  } catch (err) {
    console.warn('Cache get error:', err.message);
    return null;
  }
};

/**
 * Set value in cache with TTL
 * @param {string} type - Cache type identifier
 * @param {string} userId - Patient/User ID
 * @param {any} value - Value to cache
 * @param {number} ttlSeconds - Time to live in seconds (default: 3600 = 1 hour)
 */
const set = async (type, userId, value, ttlSeconds = 3600, ...args) => {
  try {
    const key = getCacheKey(type, userId, ...args);
    const serialized = JSON.stringify(value);
    
    if (useRedis && redis) {
      await redis.setEx(key, ttlSeconds, serialized);
      console.log(`[Cache SET] ${key} (${ttlSeconds}s TTL)`);
    } else {
      inMemoryCache.set(key, {
        value,
        expiresAt: Date.now() + (ttlSeconds * 1000)
      });
      console.log(`[Cache SET] ${key} (${ttlSeconds}s TTL, in-memory)`);
    }
  } catch (err) {
    console.warn('Cache set error:', err.message);
  }
};

/**
 * Delete cache entry
 */
const del = async (type, userId, ...args) => {
  try {
    const key = getCacheKey(type, userId, ...args);
    
    if (useRedis && redis) {
      await redis.del(key);
    } else {
      inMemoryCache.delete(key);
    }
    
    console.log(`[Cache DELETE] ${key}`);
  } catch (err) {
    console.warn('Cache delete error:', err.message);
  }
};

/**
 * Invalidate all cache for a user
 */
const invalidateUser = async (userId) => {
  try {
    if (useRedis && redis) {
      const pattern = `cache:*:${userId}*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
        console.log(`[Cache INVALIDATE] ${keys.length} entries for user ${userId}`);
      }
    } else {
      let count = 0;
      for (const [key] of inMemoryCache) {
        if (key.includes(`:${userId}`)) {
          inMemoryCache.delete(key);
          count++;
        }
      }
      if (count > 0) {
        console.log(`[Cache INVALIDATE] ${count} entries for user ${userId}`);
      }
    }
  } catch (err) {
    console.warn('Cache invalidate error:', err.message);
  }
};

/**
 * Invalidate all cache of a specific type
 */
const invalidateType = async (type) => {
  try {
    if (useRedis && redis) {
      const pattern = `cache:${type}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
        console.log(`[Cache INVALIDATE TYPE] ${keys.length} entries of type ${type}`);
      }
    } else {
      let count = 0;
      for (const [key] of inMemoryCache) {
        if (key.startsWith(`cache:${type}:`)) {
          inMemoryCache.delete(key);
          count++;
        }
      }
      if (count > 0) {
        console.log(`[Cache INVALIDATE TYPE] ${count} entries of type ${type}`);
      }
    }
  } catch (err) {
    console.warn('Cache invalidate type error:', err.message);
  }
};

/**
 * Clear entire cache
 */
const clear = async () => {
  try {
    if (useRedis && redis) {
      await redis.flushDb();
      console.log('[Cache FLUSH] Entire Redis cache cleared');
    } else {
      inMemoryCache.clear();
      console.log('[Cache FLUSH] Entire in-memory cache cleared');
    }
  } catch (err) {
    console.warn('Cache clear error:', err.message);
  }
};

/**
 * Get cache stats
 */
const getStats = async () => {
  try {
    if (useRedis && redis) {
      const info = await redis.info('stats');
      return {
        engine: 'redis',
        info,
        available: useRedis
      };
    } else {
      return {
        engine: 'in-memory',
        entries: inMemoryCache.size,
        available: true
      };
    }
  } catch (err) {
    console.warn('Cache stats error:', err.message);
    return { error: err.message };
  }
};

/**
 * Wrapped function execution with cache
 * @param {string} type - Cache type
 * @param {string} userId - User ID
 * @param {Function} fn - Async function to cache result of
 * @param {number} ttl - TTL in seconds
 * @param {...any} args - Arguments to pass to function (also used for cache key)
 */
const withCache = async (type, userId, fn, ttl = 3600, ...args) => {
  // Check cache first
  const cached = await get(type, userId, ...args);
  if (cached !== null) {
    return cached;
  }
  
  // Execute function
  const result = await fn();
  
  // Store in cache
  await set(type, userId, result, ttl, ...args);
  
  return result;
};

module.exports = {
  get,
  set,
  del,
  invalidateUser,
  invalidateType,
  clear,
  getStats,
  withCache,
  getCacheKey,
  isRedisAvailable: () => useRedis
};
