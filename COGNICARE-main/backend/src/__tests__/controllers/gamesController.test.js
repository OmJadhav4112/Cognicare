/**
 * Games Controller Tests
 * Tests for game result submission and difficulty adaptation
 */

const request = require('supertest');
const express = require('express');
const gamesController = require('../../controllers/gamesController');
const Performance = require('../../models/Performance');
const Patient = require('../../models/Patient');
const { createMockUser, createMockPerformance } = require('../helpers');

jest.mock('../../models/Performance');
jest.mock('../../models/Patient');
jest.mock('../../services/aiEngine', () => ({
  analyzePatientsGamePerformance: jest.fn().mockResolvedValue({
    memoryScore: 60,
    attentionScore: 55,
    patternScore: 65
  })
}));

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  app.post('/games/submit', (req, res, next) => {
    req.user = createMockUser();
    gamesController.submitGameResult(req, res, next);
  });
  
  app.get('/games/history', (req, res, next) => {
    req.user = createMockUser();
    gamesController.getGameHistory(req, res, next);
  });
  
  app.get('/games/stats', (req, res, next) => {
    req.user = createMockUser();
    gamesController.getGameStats(req, res, next);
  });
  
  app.get('/games/difficulty', (req, res, next) => {
    req.user = createMockUser();
    gamesController.getDifficulty(req, res, next);
  });
  
  return app;
};

describe('Games Controller', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('POST /games/submit', () => {
    it('should submit game result successfully', async () => {
      const gameData = {
        gameType: 'memoryMatching',
        difficulty: 'easy',
        score: 85,
        duration: 300,
        accuracy: 0.85
      };

      Performance.create.mockResolvedValueOnce(createMockPerformance(gameData));
      Patient.findOne.mockResolvedValueOnce({
        _id: 'patient123',
        totalActivitiesCompleted: 0,
        lastActivityDate: null,
        save: jest.fn()
      });

      const res = await request(app)
        .post('/games/submit')
        .send(gameData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(Performance.create).toHaveBeenCalled();
    });

    it('should validate required fields in game result', async () => {
      const invalidData = {
        gameType: 'memoryMatching'
        // Missing other required fields
      };

      const res = await request(app)
        .post('/games/submit')
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid difficulty level', async () => {
      const gameData = {
        gameType: 'memoryMatching',
        difficulty: 'invalid',
        score: 85,
        duration: 300,
        accuracy: 0.85
      };

      const res = await request(app)
        .post('/games/submit')
        .send(gameData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /games/history', () => {
    it('should retrieve game history', async () => {
      const mockHistory = [
        createMockPerformance({ score: 85 }),
        createMockPerformance({ score: 75 })
      ];

      Performance.find.mockResolvedValueOnce(mockHistory);

      const res = await request(app)
        .get('/games/history');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    it('should filter history by game type', async () => {
      const mockHistory = [
        createMockPerformance({ gameType: 'memoryMatching', score: 85 })
      ];

      Performance.find.mockResolvedValueOnce(mockHistory);

      const res = await request(app)
        .get('/games/history?gameType=memoryMatching');

      expect(res.status).toBe(200);
      expect(res.body.data[0].gameType).toBe('memoryMatching');
    });
  });

  describe('GET /games/stats', () => {
    it('should retrieve game statistics', async () => {
      const mockStats = {
        totalGamesPlayed: 10,
        averageScore: 75,
        gamesPerType: {
          memoryMatching: 5,
          pictureRecall: 3,
          sequenceMemory: 2,
          patternAttention: 0
        }
      };

      Performance.aggregate.mockResolvedValueOnce([mockStats]);

      const res = await request(app)
        .get('/games/stats');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /games/difficulty', () => {
    it('should get current difficulty level', async () => {
      const mockPatient = {
        _id: 'patient123',
        user: 'user123',
        gameDifficulty: {
          memoryMatching: 'easy',
          pictureRecall: 'easy',
          sequenceMemory: 'easy',
          patternAttention: 'easy'
        }
      };

      Patient.findOne.mockResolvedValueOnce(mockPatient);

      const res = await request(app)
        .get('/games/difficulty');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.memoryMatching).toBe('easy');
    });

    it('should handle patient not found', async () => {
      Patient.findOne.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/games/difficulty');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
