/**
 * Test Helpers and Utilities
 * Shared functions for testing
 */

const jwt = require('jsonwebtoken');

/**
 * Create a mock JWT token for testing
 */
const createMockToken = (userId, role = 'patient', email = 'test@example.com') => {
  return jwt.sign(
    { id: userId, email, role },
    'test-secret',
    { expiresIn: '1d' }
  );
};

/**
 * Create mock user object
 */
const createMockUser = (overrides = {}) => {
  return {
    _id: 'user123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'patient',
    language: 'en',
    ...overrides
  };
};

/**
 * Create mock patient object
 */
const createMockPatient = (overrides = {}) => {
  return {
    _id: 'patient123',
    user: 'user123',
    dateOfBirth: new Date('1960-01-01'),
    gender: 'male',
    cognitiveProfile: {
      overallLevel: 'beginner',
      memoryScore: 50,
      attentionScore: 50,
      patternScore: 50
    },
    gameDifficulty: {
      memoryMatching: 'easy',
      pictureRecall: 'easy',
      sequenceMemory: 'easy',
      patternAttention: 'easy'
    },
    totalActivitiesCompleted: 0,
    streakDays: 0,
    ...overrides
  };
};

/**
 * Create mock caregiver object
 */
const createMockCaregiver = (overrides = {}) => {
  return {
    _id: 'caregiver123',
    user: 'caregiver-user-id',
    patients: ['patient-user-id'],
    relationship: 'family',
    notificationsEnabled: true,
    ...overrides
  };
};

/**
 * Create mock family memory object
 */
const createMockMemory = (overrides = {}) => {
  return {
    _id: 'memory123',
    patient: 'patient123',
    addedBy: 'caregiver-user-id',
    type: 'person',
    title: 'Grandpa John',
    description: 'My favorite grandpa',
    photo: null,
    personName: 'John',
    relationship: 'grandfather',
    memoryHints: [],
    isFavorite: false,
    usedInGames: true,
    moderation: {
      isFlagged: false,
      reviewStatus: 'none'
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
};

/**
 * Create mock performance record
 */
const createMockPerformance = (overrides = {}) => {
  return {
    _id: 'perf123',
    patient: 'patient123',
    gameType: 'memoryMatching',
    score: 75,
    difficulty: 'easy',
    duration: 300,
    accuracy: 0.85,
    timestamp: new Date(),
    ...overrides
  };
};

/**
 * Setup test database connection
 */
let mongoServer;

const setupTestDb = async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  process.env.MONGO_URI = mongoUri;
  
  return mongoUri;
};

const teardownTestDb = async () => {
  if (mongoServer) {
    await mongoServer.stop();
  }
};

/**
 * Wait for a condition to be true
 */
const waitFor = async (condition, timeout = 1000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (condition()) return true;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  return false;
};

module.exports = {
  createMockToken,
  createMockUser,
  createMockPatient,
  createMockCaregiver,
  createMockMemory,
  createMockPerformance,
  setupTestDb,
  teardownTestDb,
  waitFor
};
