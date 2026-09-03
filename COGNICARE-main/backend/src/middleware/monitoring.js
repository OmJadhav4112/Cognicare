const monitoringService = require('../services/monitoringService');

/**
 * Monitoring Middleware
 * Automatically tracks HTTP request metrics
 */

/**
 * HTTP Request tracking middleware
 * Tracks response time and status code for all requests
 */
const trackHttpMetrics = (req, res, next) => {
  const startTime = Date.now();
  
  // Track when response ends
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Normalize path to remove IDs and avoid cardinality explosion
    let normalizedPath = req.path;
    
    // Replace MongoDB ObjectIDs with :id placeholder
    normalizedPath = normalizedPath.replace(/\/[a-f0-9]{24}/gi, '/:id');
    
    // Replace UUIDs with :id placeholder
    normalizedPath = normalizedPath.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id');
    
    monitoringService.trackRequest(req.method, normalizedPath, statusCode, duration);
  });

  next();
};

/**
 * Database query tracking
 * Should be called around database operations
 */
const trackDbQuery = async (operation, fn) => {
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    monitoringService.trackDbOperation(operation, duration, true);
    return result;
  } catch (err) {
    const duration = Date.now() - startTime;
    monitoringService.trackDbOperation(operation, duration, false);
    throw err;
  }
};

/**
 * Helper to wrap async database operations
 */
const withDbTracking = (operation) => {
  return async (fn) => {
    return await trackDbQuery(operation, fn);
  };
};

module.exports = {
  trackHttpMetrics,
  trackDbQuery,
  withDbTracking
};
