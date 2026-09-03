/**
 * Rate Limit Middleware
 * 
 * Applies role-based rate limiting to authenticated requests
 * Must be placed after authentication middleware
 */

const { getLimiterByRole } = require('../services/rateLimitService');

/**
 * Role-based rate limit middleware
 * Applies different limits based on user role
 * Must be used after req.user is set (protect middleware)
 */
const roleBasedRateLimit = async (req, res, next) => {
  // Skip if user not authenticated (will be caught by protect middleware)
  if (!req.user || !req.user.role) {
    return next();
  }

  // Get limiter for user's role
  const limiter = getLimiterByRole(req.user.role);

  // Apply the limiter
  limiter(req, res, next);
};

/**
 * Strict rate limiting for sensitive endpoints
 * Use this for account deletion, password changes, etc.
 */
const sensitiveOperationRateLimit = (req, res, next) => {
  const { strictLimiter } = require('../services/rateLimitService');
  strictLimiter(req, res, next);
};

module.exports = {
  roleBasedRateLimit,
  sensitiveOperationRateLimit
};
