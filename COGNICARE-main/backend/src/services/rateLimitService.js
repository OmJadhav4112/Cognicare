/**
 * Rate Limiting Service
 * 
 * Provides role-based rate limiting for DementiaCare+ API
 * Supports different tiers: patient, caregiver, admin
 */

const rateLimit = require('express-rate-limit');

/**
 * Create a rate limiter with in-memory store
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} max - Maximum requests per window
 * @param {string} keyGenerator - Custom key generator function
 * @returns {Function} Express middleware
 */
const createLimiter = (windowMs, max, keyGenerator = null) => {
  const config = {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      if (req.path === '/health') return true;
      return false;
    },
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: req.rateLimit.resetTime
      });
    }
  };

  if (keyGenerator) {
    config.keyGenerator = keyGenerator;
  }

  return rateLimit(config);
};

/**
 * Global rate limiter: 1000 req/15min (IP-based)
 */
const globalLimiter = createLimiter(
  15 * 60 * 1000,
  1000,
  (req) => req.ip || req.connection.remoteAddress
);

/**
 * Patient rate limiter: 100 req/min
 */
const patientLimiter = createLimiter(
  60 * 1000,
  100,
  (req) => `patient:${req.userId || req.ip}`
);

/**
 * Caregiver rate limiter: 200 req/min
 */
const caregiverLimiter = createLimiter(
  60 * 1000,
  200,
  (req) => `caregiver:${req.userId || req.ip}`
);

/**
 * Admin rate limiter: 500 req/min
 */
const adminLimiter = createLimiter(
  60 * 1000,
  500,
  (req) => `admin:${req.userId || req.ip}`
);

/**
 * Strict rate limiter: 10 req/min (sensitive operations)
 */
const strictLimiter = createLimiter(
  60 * 1000,
  10,
  (req) => `strict:${req.userId || req.ip}`
);

/**
 * Auth rate limiter: 5 attempts/15min
 */
const authLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  (req) => {
    const email = req.body?.email || 'unknown';
    return `auth:${email}:${req.ip}`;
  }
);

/**
 * Game rate limiter: 30 actions/min
 */
const gameLimiter = createLimiter(
  60 * 1000,
  30,
  (req) => `game:${req.userId || req.ip}`
);

/**
 * Endpoint-specific limiters
 */
const endpointLimiters = {
  // AI recommendations: 5/hour
  aiRecommendations: createLimiter(
    60 * 60 * 1000,
    5,
    (req) => `ai-rec:${req.userId || req.ip}`
  ),

  // Data export: 3/24hours
  dataExport: createLimiter(
    24 * 60 * 60 * 1000,
    3,
    (req) => `export:${req.userId}`
  ),

  // Compliance reports: 2/hour
  complianceReport: createLimiter(
    60 * 60 * 1000,
    2,
    (req) => `compliance:${req.userId}`
  ),

  // File uploads: 20/hour
  fileUpload: createLimiter(
    60 * 60 * 1000,
    20,
    (req) => `upload:${req.userId}`
  )
};

/**
 * Get limiter by user role
 */
const getLimiterByRole = (role) => {
  switch (role) {
    case 'admin':
      return adminLimiter;
    case 'caregiver':
      return caregiverLimiter;
    case 'patient':
    default:
      return patientLimiter;
  }
};

module.exports = {
  globalLimiter,
  patientLimiter,
  caregiverLimiter,
  adminLimiter,
  strictLimiter,
  authLimiter,
  gameLimiter,
  endpointLimiters,
  getLimiterByRole,
  createLimiter
};
