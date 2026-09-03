/**
 * Jest Setup File
 * Configures test environment and global mocks
 */

// Increase timeout for database operations
jest.setTimeout(30000);

// Suppress console logs during tests (can be commented out for debugging)
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.log = originalLog;
  console.error = originalError;
  console.warn = originalWarn;
});

// Mock Firebase Admin SDK
jest.mock('../config/firebaseAdmin', () => ({
  auth: jest.fn().mockReturnValue({
    verifyIdToken: jest.fn().mockResolvedValue({
      uid: 'test-uid',
      email: 'test@example.com'
    }),
    createUser: jest.fn().mockResolvedValue({ uid: 'new-uid' }),
    deleteUser: jest.fn().mockResolvedValue(true)
  }),
  firestore: jest.fn().mockReturnValue({
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        set: jest.fn().mockResolvedValue(true),
        get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
        delete: jest.fn().mockResolvedValue(true)
      })
    })
  })
}));

// Mock node-schedule for tests
jest.mock('node-schedule', () => ({
  scheduleJob: jest.fn((schedule, callback) => ({
    cancel: jest.fn(),
    nextInvocation: jest.fn(() => new Date(Date.now() + 86400000))
  }))
}));

// Mock sharp for image processing
jest.mock('sharp', () => {
  return jest.fn().mockReturnValue({
    blur: jest.fn().mockReturnThis(),
    resize: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('test'))
  });
});

// Mock multer for file uploads
jest.mock('multer', () => {
  return jest.fn().mockReturnValue({
    single: jest.fn(() => (req, res, next) => next()),
    array: jest.fn(() => (req, res, next) => next())
  });
});
