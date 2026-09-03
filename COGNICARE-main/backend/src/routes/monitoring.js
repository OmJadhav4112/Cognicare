const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');
const monitoringService = require('../services/monitoringService');

const router = express.Router();

/**
 * Monitoring and metrics endpoints
 * Most endpoints require admin authentication
 */

/**
 * GET /api/metrics/health
 * Quick health check (no auth required, for load balancers)
 */
router.get('/health', (req, res) => {
  const health = monitoringService.getHealthStatus();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * GET /api/metrics/prometheus
 * Prometheus-format metrics (for scraping)
 * Query: ?detailed=true (for more detailed metrics)
 */
router.get('/prometheus', protect, restrictTo('admin'), (req, res) => {
  const metrics = monitoringService.getPrometheusMetrics();
  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.send(metrics);
});

/**
 * GET /api/metrics/dashboard
 * Comprehensive dashboard data (JSON)
 */
router.get('/dashboard', protect, restrictTo('admin'), (req, res) => {
  try {
    const dashboard = monitoringService.getDashboardData();
    res.json({
      success: true,
      data: dashboard
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * GET /api/metrics/endpoints
 * All endpoint metrics
 * Query: ?sort=errors|time|requests (default: requests)
 */
router.get('/endpoints', protect, restrictTo('admin'), (req, res) => {
  try {
    const { sort = 'requests' } = req.query;
    let endpoints = monitoringService.getAllEndpointMetrics();

    // Sort by requested field
    switch (sort) {
      case 'errors':
        endpoints = endpoints.sort((a, b) => b.errors - a.errors);
        break;
      case 'time':
        endpoints = endpoints.sort((a, b) => 
          parseFloat(b.p99ResponseTime) - parseFloat(a.p99ResponseTime)
        );
        break;
      case 'requests':
      default:
        endpoints = endpoints.sort((a, b) => b.total - a.total);
    }

    res.json({
      success: true,
      data: endpoints
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * GET /api/metrics/endpoints/:endpoint
 * Detailed metrics for a specific endpoint
 * :endpoint = "GET /api/patient/profile" (URL encoded)
 */
router.get('/endpoints/:endpoint', protect, restrictTo('admin'), (req, res) => {
  try {
    const endpoint = decodeURIComponent(req.params.endpoint);
    const metrics = monitoringService.getEndpointMetrics(endpoint);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: `No metrics found for endpoint: ${endpoint}`
      });
    }

    res.json({
      success: true,
      data: metrics
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * GET /api/metrics/database
 * Database operation metrics
 * Query: ?sort=errors|time|operations (default: operations)
 */
router.get('/database', protect, restrictTo('admin'), (req, res) => {
  try {
    const { sort = 'operations' } = req.query;
    let dbMetrics = monitoringService.getDbMetrics();

    switch (sort) {
      case 'errors':
        dbMetrics = dbMetrics.sort((a, b) => b.errors - a.errors);
        break;
      case 'time':
        dbMetrics = dbMetrics.sort((a, b) => 
          parseFloat(b.p99Time) - parseFloat(a.p99Time)
        );
        break;
      case 'operations':
      default:
        dbMetrics = dbMetrics.sort((a, b) => b.total - a.total);
    }

    res.json({
      success: true,
      data: dbMetrics
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * GET /api/metrics/summary
 * High-level summary metrics
 */
router.get('/summary', protect, restrictTo('admin'), (req, res) => {
  try {
    const health = monitoringService.getHealthStatus();
    const endpoints = monitoringService.getAllEndpointMetrics();
    const dbMetrics = monitoringService.getDbMetrics();

    const summary = {
      health: health.status,
      uptime: health.uptime,
      requestsTotal: health.requestsTotal,
      errorsTotal: health.errorsTotal,
      errorRate: health.errorRate,
      topEndpoints: endpoints.slice(0, 5),
      slowestEndpoints: endpoints
        .sort((a, b) => parseFloat(b.p99ResponseTime) - parseFloat(a.p99ResponseTime))
        .slice(0, 5),
      errorEndpoints: endpoints
        .filter(e => e.errors > 0)
        .sort((a, b) => b.errors - a.errors)
        .slice(0, 5),
      topDbOperations: dbMetrics.slice(0, 5),
      dependencies: health.dependencies
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * POST /api/metrics/reset
 * Reset all metrics (for testing only)
 */
router.post('/reset', protect, restrictTo('admin'), (req, res) => {
  try {
    monitoringService.reset();
    res.json({
      success: true,
      message: 'Metrics reset successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

module.exports = router;
