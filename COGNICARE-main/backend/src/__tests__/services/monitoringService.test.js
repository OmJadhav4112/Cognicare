/**
 * Monitoring Service Tests
 * Tests for metrics collection and reporting
 */

const monitoringService = require('../../services/monitoringService');

describe('Monitoring Service', () => {
  beforeEach(() => {
    monitoringService.reset();
  });

  describe('trackRequest', () => {
    it('should track HTTP request metrics', () => {
      monitoringService.trackRequest('GET', '/api/patient/profile', 200, 50);

      const metrics = monitoringService.getEndpointMetrics('GET /api/patient/profile');

      expect(metrics).toBeDefined();
      expect(metrics.total).toBe(1);
      expect(metrics.errors).toBe(0);
      expect(metrics.responseTime.min).toBe(50);
      expect(metrics.responseTime.max).toBe(50);
      expect(metrics.responseTime.avg).toBe(50);
    });

    it('should track multiple requests and calculate percentiles', () => {
      const times = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      
      times.forEach(time => {
        monitoringService.trackRequest('GET', '/api/test', 200, time);
      });

      const metrics = monitoringService.getEndpointMetrics('GET /api/test');

      expect(metrics.total).toBe(10);
      expect(metrics.responseTime.p50).toBeDefined();
      expect(metrics.responseTime.p95).toBeDefined();
      expect(metrics.responseTime.p99).toBeDefined();
      expect(metrics.responseTime.p95).toBeGreaterThan(metrics.responseTime.p50);
      expect(metrics.responseTime.p99).toBeGreaterThan(metrics.responseTime.p95);
    });

    it('should track error responses', () => {
      monitoringService.trackRequest('POST', '/api/auth/login', 401, 100);
      monitoringService.trackRequest('POST', '/api/auth/login', 401, 110);
      monitoringService.trackRequest('POST', '/api/auth/login', 200, 90);

      const metrics = monitoringService.getEndpointMetrics('POST /api/auth/login');

      expect(metrics.total).toBe(3);
      expect(metrics.errors).toBe(2);
      expect(metrics.errorRate).toBe('66.67%');
    });

    it('should track status code distribution', () => {
      monitoringService.trackRequest('GET', '/api/data', 200, 50);
      monitoringService.trackRequest('GET', '/api/data', 200, 55);
      monitoringService.trackRequest('GET', '/api/data', 404, 100);

      const metrics = monitoringService.getEndpointMetrics('GET /api/data');

      expect(metrics.statusCodes[200]).toBe(2);
      expect(metrics.statusCodes[404]).toBe(1);
    });
  });

  describe('trackDbOperation', () => {
    it('should track database operations', () => {
      monitoringService.trackDbOperation('User.findById', 25, true);
      monitoringService.trackDbOperation('User.findById', 30, true);
      monitoringService.trackDbOperation('User.findById', 35, true);

      const dbMetrics = monitoringService.getDbMetrics();
      const userFind = dbMetrics.find(m => m.operation === 'User.findById');

      expect(userFind.total).toBe(3);
      expect(userFind.errors).toBe(0);
      expect(parseFloat(userFind.avgTime)).toBeCloseTo(30, 1);
    });

    it('should track database operation failures', () => {
      monitoringService.trackDbOperation('Patient.create', 100, false);
      monitoringService.trackDbOperation('Patient.create', 110, false);
      monitoringService.trackDbOperation('Patient.create', 120, true);

      const dbMetrics = monitoringService.getDbMetrics();
      const patientCreate = dbMetrics.find(m => m.operation === 'Patient.create');

      expect(patientCreate.total).toBe(3);
      expect(patientCreate.errors).toBe(2);
      expect(patientCreate.errorRate).toBe('66.67');
    });
  });

  describe('calculatePercentile', () => {
    it('should calculate p50 correctly', () => {
      const values = [10, 20, 30, 40, 50];
      const p50 = monitoringService.calculatePercentile(values, 50);

      expect(p50).toBe(30); // Median
    });

    it('should calculate p95 correctly', () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 1);
      const p95 = monitoringService.calculatePercentile(values, 95);

      expect(p95).toBeGreaterThanOrEqual(94);
      expect(p95).toBeLessThanOrEqual(100);
    });

    it('should handle single value', () => {
      const p50 = monitoringService.calculatePercentile([50], 50);
      expect(p50).toBe(50);
    });

    it('should handle empty array', () => {
      const p50 = monitoringService.calculatePercentile([], 50);
      expect(p50).toBe(0);
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when all dependencies healthy', () => {
      monitoringService.updateHealthCheck('database', true, 5);
      monitoringService.updateHealthCheck('redis', true, 2);
      monitoringService.updateHealthCheck('firebase', true, 1);

      const health = monitoringService.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.dependencies.database.healthy).toBe(true);
      expect(health.dependencies.redis.healthy).toBe(true);
    });

    it('should return degraded status when dependency unhealthy', () => {
      monitoringService.updateHealthCheck('database', false, 0);
      monitoringService.updateHealthCheck('redis', true, 2);
      monitoringService.updateHealthCheck('firebase', true, 1);

      const health = monitoringService.getHealthStatus();

      expect(health.status).toBe('degraded');
      expect(health.dependencies.database.healthy).toBe(false);
    });

    it('should calculate error rate correctly', () => {
      // Simulate requests
      for (let i = 0; i < 10; i++) {
        monitoringService.trackRequest('GET', '/test', i % 2 === 0 ? 200 : 500, 50);
      }

      const health = monitoringService.getHealthStatus();

      expect(health.requestsTotal).toBe(10);
      expect(health.errorsTotal).toBe(5);
      expect(health.errorRate).toBe('50.00%');
    });
  });

  describe('getAllEndpointMetrics', () => {
    it('should return sorted list of endpoints', () => {
      monitoringService.trackRequest('GET', '/api/a', 200, 50);
      monitoringService.trackRequest('GET', '/api/a', 200, 50);
      monitoringService.trackRequest('GET', '/api/a', 200, 50);

      monitoringService.trackRequest('GET', '/api/b', 200, 50);
      monitoringService.trackRequest('GET', '/api/b', 200, 50);

      const metrics = monitoringService.getAllEndpointMetrics();

      expect(metrics[0].endpoint).toBe('GET /api/a');
      expect(metrics[0].total).toBe(3);
      expect(metrics[1].endpoint).toBe('GET /api/b');
      expect(metrics[1].total).toBe(2);
    });
  });

  describe('getPrometheusMetrics', () => {
    it('should generate valid Prometheus format', () => {
      monitoringService.trackRequest('GET', '/api/test', 200, 100);

      const output = monitoringService.getPrometheusMetrics();

      expect(output).toContain('# HELP dementiacare_requests_total');
      expect(output).toContain('# TYPE dementiacare_requests_total counter');
      expect(output).toContain('dementiacare_requests_total 1');
      expect(output).toContain('# HELP dementiacare_request_duration_ms');
    });
  });

  describe('getDashboardData', () => {
    it('should return complete dashboard data', () => {
      // Create some metrics
      for (let i = 0; i < 5; i++) {
        monitoringService.trackRequest('GET', '/api/fast', 200, 10 + i);
        monitoringService.trackRequest('GET', '/api/slow', 200, 1000 + i);
        monitoringService.trackRequest('POST', '/api/error', 500, 50);
      }

      const dashboard = monitoringService.getDashboardData();

      expect(dashboard).toHaveProperty('health');
      expect(dashboard).toHaveProperty('endpoints');
      expect(dashboard).toHaveProperty('database');
      expect(dashboard).toHaveProperty('topErrorEndpoints');
      expect(dashboard).toHaveProperty('slowestEndpoints');
      expect(dashboard.slowestEndpoints[0].endpoint).toContain('slow');
    });
  });

  describe('reset', () => {
    it('should clear all metrics', () => {
      monitoringService.trackRequest('GET', '/test', 200, 50);
      expect(monitoringService.systemMetrics.requestsTotal).toBe(1);

      monitoringService.reset();

      expect(monitoringService.systemMetrics.requestsTotal).toBe(0);
      expect(monitoringService.getAllEndpointMetrics()).toHaveLength(0);
    });
  });
});
