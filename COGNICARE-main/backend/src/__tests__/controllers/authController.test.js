/**
 * Auth Controller Tests
 * Tests for user authentication (register, login, profile management)
 */

const request = require('supertest');
const express = require('express');
const authController = require('../../controllers/authController');
const User = require('../../models/User');
const { createMockToken, createMockUser } = require('../helpers');

// Mock User model
jest.mock('../../models/User');

// Create a minimal test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Test routes
  app.post('/auth/register', authController.register);
  app.post('/auth/login', authController.login);
  app.get('/auth/me', (req, res, next) => {
    // Mock protect middleware
    req.user = createMockUser();
    authController.getMe(req, res, next);
  });
  
  return app;
};

describe('Auth Controller', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'patient'
      };

      User.findOne.mockResolvedValueOnce(null); // Email doesn't exist
      User.create.mockResolvedValueOnce(createMockUser(userData));

      const res = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(User.create).toHaveBeenCalled();
    });

    it('should reject registration with existing email', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'patient'
      };

      User.findOne.mockResolvedValueOnce(createMockUser({ email: userData.email }));

      const res = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with mismatched passwords', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'DifferentPass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'patient'
      };

      const res = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'weak',
        confirmPassword: 'weak',
        firstName: 'John',
        lastName: 'Doe',
        role: 'patient'
      };

      const res = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /auth/login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'SecurePass123!'
      };

      const mockUser = createMockUser({ password: 'hashed-password' });
      User.findOne.mockResolvedValueOnce(mockUser);
      
      // Mock password comparison
      mockUser.comparePassword = jest.fn().mockResolvedValueOnce(true);

      const res = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'SecurePass123!'
      };

      User.findOne.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject login with wrong password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      const mockUser = createMockUser();
      User.findOne.mockResolvedValueOnce(mockUser);
      
      mockUser.comparePassword = jest.fn().mockResolvedValueOnce(false);

      const res = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /auth/me', () => {
    it('should get current user profile', async () => {
      const res = await request(app)
        .get('/auth/me');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('email');
      expect(res.body.data.email).toBe('test@example.com');
    });
  });
});
