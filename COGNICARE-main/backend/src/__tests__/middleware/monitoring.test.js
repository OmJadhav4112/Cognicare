/**
 * Monitoring Middleware Tests
 * Tests for request tracking and metrics
 */

const { trackHttpMetrics, trackDbQuery } = require('../../middleware/monitoring');
const monitoringService = require('../../services/monitoringService');

jest.mock('../../services/monitoringService');

describe('Monitoring Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trackHttpMetrics middleware', () => {
    it('should track HTTP requests', (done) => {
      const req = {
        method: 'GET',
        path: '/api/patient/profile'
      };

      const res = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            // Simulate response finish
            setTimeout(callback, 10);
          }
        })
      };

      const next = jest.fn();

      trackHttpMetrics(req, res, next);

      expect(next).toHaveBeenCalled();

      // Wait for async tracking
      setTimeout(() => {
        expect(monitoringService.trackRequest).toHaveBeenCalled();
        done();
      }, 20);
    });

    it('should normalize paths with ObjectIDs', (done) => {
      const req = {
        method: 'GET',
        path: '/api/patients/507f1f77bcf86cd799439011/memories'
      };

      const res = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            setTimeout(callback, 10);
          }
        })
      };

      trackHttpMetrics(req, res, jest.fn());

      setTimeout(() => {
        const callArgs = monitoringService.trackRequest.mock.calls[0];
        expect(callArgs[1]).toContain(':id');
        done();
      }, 20);
    });

    it('should track error responses', (done) => {
      const req = {
        method: 'POST',
        path: '/api/auth/login'
      };

      const res = {
        statusCode: 401,
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            setTimeout(callback, 10);
          }
        })
      };

      trackHttpMetrics(req, res, jest.fn());

      setTimeout(() => {
        const callArgs = monitoringService.trackRequest.mock.calls[0];
        expect(callArgs[2]).toBe(401); // status code
        done();
      }, 20);
    });
  });

  describe('trackDbQuery function', () => {
    it('should track successful database operations', async () => {
      const operation = 'User.findById';
      const mockResult = { _id: 'user123', email: 'test@example.com' };

      const result = await trackDbQuery(operation, async () => {
        return mockResult;
      });

      expect(result).toEqual(mockResult);
      expect(monitoringService.trackDbOperation).toHaveBeenCalledWith(
        operation,
        expect.any(Number),
        true
      );
    });

    it('should track failed database operations', async () => {
      const operation = 'User.findById';
      const error = new Error('Database connection failed');

      await expect(
        trackDbQuery(operation, async () => {
          throw error;
        })
      ).rejects.toThrow(error);

      expect(monitoringService.trackDbOperation).toHaveBeenCalledWith(
        operation,
        expect.any(Number),
        false
      );
    });

    it('should measure operation duration', async () => {
      const operation = 'Patient.findOne';

      await trackDbQuery(operation, async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { _id: 'patient123' };
      });

      const callArgs = monitoringService.trackDbOperation.mock.calls[0];
      const duration = callArgs[1];
      
      // Duration should be at least 50ms
      expect(duration).toBeGreaterThanOrEqual(40);
    });
  });
});
