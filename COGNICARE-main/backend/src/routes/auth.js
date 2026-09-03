const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { register, login, loginDev, registerDev, getMe, updateLanguage, updateEmail, deleteAccount } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../services/rateLimitService');
const { sensitiveOperationRateLimit } = require('../middleware/rateLimit');

// Validation rules
const passwordStrengthValidation = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
  .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
  .matches(/[0-9]/).withMessage('Password must contain at least one digit')
  .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character (!@#$%^&*)');

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['patient', 'caregiver']).withMessage('Role must be patient or caregiver')
];

const loginValidation = [
  body('idToken').notEmpty().withMessage('ID token is required')
];

const loginDevValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

const registerDevValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  passwordStrengthValidation,
  body('role').isIn(['patient', 'caregiver']).withMessage('Role must be patient or caregiver')
];

const updateEmailValidation = [
  body('newEmail').isEmail().withMessage('Valid email is required').normalizeEmail()
];

// Apply strict rate limiting to auth endpoints
router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.post('/login-dev', authLimiter, loginDevValidation, loginDev);
router.post('/register-dev', authLimiter, registerDevValidation, registerDev);
router.get('/me', protect, getMe);
router.patch('/language', protect, updateLanguage);
router.patch('/email', protect, sensitiveOperationRateLimit, updateEmailValidation, updateEmail);
router.delete('/account', protect, sensitiveOperationRateLimit, deleteAccount);

module.exports = router;
