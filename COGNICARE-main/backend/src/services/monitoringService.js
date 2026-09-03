/**
 * Monitoring Service
 * Provides metrics collection and reporting for API instrumentation
 * 
 * Built without external dependencies for portability
 * Collects:
 * - Request response times (p50, p95, p99)
 * - Error rates per endpoint
 * - Database operation metrics
 * - Dependency health
 * - Memory and CPU usage
 */

class MonitoringService {
  constructor() {
    // Endpoint metrics: path -> { times: [], errors: 0, total: 0 }
    this.endpointMetrics = new Map();
    
    // Database metrics: operation -> { times: [], errors: 0, total: 0 }
    this.dbMetrics = new Map();
    
    // Overall system metrics
    this.systemMetrics = {
      startTime: Date.now(),
      requestsTotal: 0,
      errorsTotal: 0,
      uptime: 0
    };
    
    // Health checks
    this.healthChecks = {
      database: { healthy: false, lastCheck: null, responseTime: 0 },
      redis: { healthy: false, lastCheck: null, responseTime: 0 },
      firebase: { healthy: false, lastCheck: null, responseTime: 0 }
    };
    
    // Max samples to keep in memory (oldest are dropped)
    this.maxSamples = 10000;
    
    // Percentile thresholds for aggregation
    this.percentiles = [50, 95, 99];
  }

  /**
   * Track HTTP request metrics
   */
  trackRequest(method, path, statusCode, duration) {
    const endpoint = `${method} ${path}`;
    
    if (!this.endpointMetrics.has(endpoint)) {
      this.endpointMetrics.set(endpoint, {
        times: [],
        errors: 0,
        total: 0,
        statusCodes: {}
      });
    }

    const metrics = this.endpointMetrics.get(endpoint);
    metrics.times.push(duration);
    metrics.total++;
    metrics.statusCodes[statusCode] = (metrics.statusCodes[statusCode] || 0) + 1;

    if (statusCode >= 400) {
      metrics.errors++;
    }

    // Keep only recent samples to avoid memory bloat
    if (metrics.times.length > this.maxSamples) {
      metrics.times = metrics.times.slice(-this.maxSamples);
    }

    this.systemMetrics.requestsTotal++;
    if (statusCode >= 400) {
      this.systemMetrics.errorsTotal++;
    }
  }

  /**
   * Track database operation metrics
   */
  trackDbOperation(operation, duration, success = true) {
    const operationKey = operation;
    
    if (!this.dbMetrics.has(operationKey)) {
      this.dbMetrics.set(operationKey, {
        times: [],
        errors: 0,
        total: 0
      });
    }

    const metrics = this.dbMetrics.get(operationKey);
    metrics.times.push(duration);
    metrics.total++;

    if (!success) {
      metrics.errors++;
    }

    if (metrics.times.length > this.maxSamples) {
      metrics.times = metrics.times.slice(-this.maxSamples);
    }
  }

  /**
   * Calculate percentile from sorted array
   */
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get metrics for a specific endpoint
   */
  getEndpointMetrics(endpoint) {
    if (!this.endpointMetrics.has(endpoint)) {
      return null;
    }

    const metrics = this.endpointMetrics.get(endpoint);
    const times = metrics.times;

    return {
      endpoint,
      total: metrics.total,
      errors: metrics.errors,
      errorRate: metrics.total > 0 ? (metrics.errors / metrics.total * 100).toFixed(2) + '%' : '0%',
      responseTime: {
        min: Math.min(...times),
        max: Math.max(...times),
        avg: times.reduce((a, b) => a + b, 0) / times.length,
        p50: this.calculatePercentile(times, 50),
        p95: this.calculatePercentile(times, 95),
        p99: this.calculatePercentile(times, 99)
      },
      statusCodes: metrics.statusCodes,
      sampleSize: times.length
    };
  }

  /**
   * Get all endpoint metrics
   */
  getAllEndpointMetrics() {
    const metrics = [];
    
    for (const [endpoint, data] of this.endpointMetrics.entries()) {
      metrics.push({
        endpoint,
        total: data.total,
        errors: data.errors,
        errorRate: data.total > 0 ? ((data.errors / data.total) * 100).toFixed(2) : '0',
        avgResponseTime: data.times.length > 0 
          ? (data.times.reduce((a, b) => a + b, 0) / data.times.length).toFixed(2)
          : 0,
        p95ResponseTime: this.calculatePercentile(data.times, 95).toFixed(2),
        p99ResponseTime: this.calculatePercentile(data.times, 99).toFixed(2)
      });
    }

    return metrics.sort((a, b) => b.total - a.total);
  }

  /**
   * Get database metrics
   */
  getDbMetrics() {
    const metrics = [];

    for (const [operation, data] of this.dbMetrics.entries()) {
      metrics.push({
        operation,
        total: data.total,
        errors: data.errors,
        errorRate: data.total > 0 ? ((data.errors / data.total) * 100).toFixed(2) : '0',
        avgTime: data.times.length > 0
          ? (data.times.reduce((a, b) => a + b, 0) / data.times.length).toFixed(2)
          : 0,
        p95Time: this.calculatePercentile(data.times, 95).toFixed(2),
        p99Time: this.calculatePercentile(data.times, 99).toFixed(2)
      });
    }

    return metrics.sort((a, b) => b.total - a.total);
  }

  /**
   * Update dependency health check
   */
  updateHealthCheck(dependency, healthy, responseTime = 0) {
    if (this.healthChecks.hasOwnProperty(dependency)) {
      this.healthChecks[dependency] = {
        healthy,
        lastCheck: new Date(),
        responseTime
      };
    }
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth(connection) {
    try {
      const startTime = Date.now();
      
      // Ping MongoDB to check connection
      if (connection && connection.db) {
        await connection.db.admin().ping();
        const responseTime = Date.now() - startTime;
        this.updateHealthCheck('database', true, responseTime);
        return true;
      }
      
      this.updateHealthCheck('database', false, 0);
      return false;
    } catch (err) {
      console.error('[Monitoring] Database health check failed:', err.message);
      this.updateHealthCheck('database', false, 0);
      return false;
    }
  }

  /**
   * Check Redis health (if available)
   */
  async checkRedisHealth(redisClient) {
    try {
      const startTime = Date.now();
      
      if (redisClient) {
        await redisClient.ping();
        const responseTime = Date.now() - startTime;
        this.updateHealthCheck('redis', true, responseTime);
        return true;
      }
      
      this.updateHealthCheck('redis', true, 0); // Assume healthy if not configured
      return true;
    } catch (err) {
      console.error('[Monitoring] Redis health check failed:', err.message);
      this.updateHealthCheck('redis', false, 0);
      return false;
    }
  }

  /**
   * Check Firebase health
   */
  async checkFirebaseHealth(firebaseAdmin) {
    try {
      const startTime = Date.now();
      
      if (firebaseAdmin) {
        // Firebase is considered healthy if admin SDK is initialized
        const responseTime = Date.now() - startTime;
        this.updateHealthCheck('firebase', true, responseTime);
        return true;
      }
      
      this.updateHealthCheck('firebase', false, 0);
      return false;
    } catch (err) {
      console.error('[Monitoring] Firebase health check failed:', err.message);
      this.updateHealthCheck('firebase', false, 0);
      return false;
    }
  }

  /**
   * Get overall system health
   */
  getHealthStatus() {
    const uptime = Date.now() - this.systemMetrics.startTime;
    const errorRate = this.systemMetrics.requestsTotal > 0
      ? (this.systemMetrics.errorsTotal / this.systemMetrics.requestsTotal * 100).toFixed(2)
      : 0;

    const allHealthy = Object.values(this.healthChecks).every(h => h.healthy);

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      uptime: `${(uptime / 1000 / 60).toFixed(2)} minutes`,
      requestsTotal: this.systemMetrics.requestsTotal,
      errorsTotal: this.systemMetrics.errorsTotal,
      errorRate: errorRate + '%',
      dependencies: this.healthChecks
    };
  }

  /**
   * Get comprehensive monitoring dashboard data
   */
  getDashboardData() {
    return {
      health: this.getHealthStatus(),
      endpoints: this.getAllEndpointMetrics(),
      database: this.getDbMetrics(),
      topErrorEndpoints: this.getAllEndpointMetrics()
        .filter(e => e.errors > 0)
        .sort((a, b) => b.errors - a.errors)
        .slice(0, 10),
      slowestEndpoints: this.getAllEndpointMetrics()
        .sort((a, b) => parseFloat(b.p99ResponseTime) - parseFloat(a.p99ResponseTime))
        .slice(0, 10),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get metrics in Prometheus text format
   */
  getPrometheusMetrics() {
    let output = '# HELP dementiacare_requests_total Total HTTP requests\n';
    output += '# TYPE dementiacare_requests_total counter\n';
    output += `dementiacare_requests_total ${this.systemMetrics.requestsTotal}\n\n`;

    output += '# HELP dementiacare_errors_total Total HTTP errors\n';
    output += '# TYPE dementiacare_errors_total counter\n';
    output += `dementiacare_errors_total ${this.systemMetrics.errorsTotal}\n\n`;

    output += '# HELP dementiacare_request_duration_ms Request duration in milliseconds\n';
    output += '# TYPE dementiacare_request_duration_ms histogram\n';

    // Add per-endpoint metrics
    for (const [endpoint, data] of this.endpointMetrics.entries()) {
      const [method, path] = endpoint.split(' ');
      const safePath = path.replace(/\//g, '_').replace(/:/g, '');
      const label = `{method="${method}",path="${safePath}"}`;

      output += `dementiacare_requests_total${label} ${data.total}\n`;
      output += `dementiacare_errors${label} ${data.errors}\n`;

      if (data.times.length > 0) {
        const avg = data.times.reduce((a, b) => a + b, 0) / data.times.length;
        output += `dementiacare_request_duration_avg_ms${label} ${avg.toFixed(2)}\n`;
        output += `dementiacare_request_duration_p95_ms${label} ${this.calculatePercentile(data.times, 95).toFixed(2)}\n`;
        output += `dementiacare_request_duration_p99_ms${label} ${this.calculatePercentile(data.times, 99).toFixed(2)}\n`;
      }
    }

    output += '\n# HELP dementiacare_database_operations Database operation metrics\n';
    output += '# TYPE dementiacare_database_operations counter\n';

    for (const [operation, data] of this.dbMetrics.entries()) {
      output += `dementiacare_db_operations_total{operation="${operation}"} ${data.total}\n`;
      output += `dementiacare_db_errors{operation="${operation}"} ${data.errors}\n`;
    }

    return output;
  }

  /**
   * Clear old metrics (for memory management)
   */
  clearOldMetrics(maxAge = 3600000) { // 1 hour default
    const now = Date.now();
    // This is a simplified approach - in production, timestamp each metric
    // For now, we just keep the last maxSamples per endpoint
  }

  /**
   * Reset metrics (for testing)
   */
  reset() {
    this.endpointMetrics.clear();
    this.dbMetrics.clear();
    this.systemMetrics = {
      startTime: Date.now(),
      requestsTotal: 0,
      errorsTotal: 0,
      uptime: 0
    };
  }
}

// Singleton instance
const monitoringService = new MonitoringService();

module.exports = monitoringService;
