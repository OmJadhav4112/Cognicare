/**
 * Auth Middleware Tests
 * Tests for authentication and authorization
 */

const { protect, restrictTo } = require('../../middleware/auth');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');

jest.mock('../../models/User');
jest.mock('../../config/firebaseAdmin');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      headers: {},
      user: null
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    next = jest.fn();
  });

  describe('protect middleware', () => {
    it('should allow authenticated requests', async () => {
      const token = jwt.sign({ id: 'user123', email: 'test@example.com' }, 'test-secret');
      req.headers.authorization = `Bearer ${token}`;

      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        role: 'patient'
      };

      User.findById.mockResolvedValueOnce(mockUser);

      // Mock JWT verification
      jwt.verify = jest.fn().mockReturnValue({ id: 'user123' });

      await protect(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });

    it('should reject requests without token', async () => {
      req.headers.authorization = undefined;

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid token', async () => {
      req.headers.authorization = 'Bearer invalid-token';

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject requests with expired token', async () => {
      req.headers.authorization = 'Bearer expired-token';
      
      jwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('Token expired');
      });

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should handle user not found', async () => {
      const token = jwt.sign({ id: 'nonexistent' }, 'test-secret');
      req.headers.authorization = `Bearer ${token}`;

      jwt.verify = jest.fn().mockReturnValue({ id: 'nonexistent' });
      User.findById.mockResolvedValueOnce(null);

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('restrictTo middleware', () => {
    it('should allow requests from authorized roles', () => {
      req.user = { role: 'admin' };

      const middleware = restrictTo('admin', 'moderator');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject requests from unauthorized roles', () => {
      req.user = { role: 'patient' };

      const middleware = restrictTo('admin', 'moderator');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle missing user', () => {
      req.user = null;

      const middleware = restrictTo('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
