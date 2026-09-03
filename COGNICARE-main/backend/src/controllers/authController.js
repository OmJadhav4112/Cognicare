const { validationResult } = require('express-validator');
const admin = require('../config/firebaseAdmin');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Caregiver = require('../models/Caregiver');

// @desc    Register a new user (patient or caregiver)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, role, phone, preferredLanguage, caregiverCode } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email is already registered.' });
    }

    // Create Firebase user
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().createUser({
        email,
        password,
        displayName: name
      });
      console.log('Firebase user created:', firebaseUser.uid);
    } catch (firebaseError) {
      console.warn('Firebase registration failed, creating local user only:', firebaseError.message);
      // In dev mode, create a mock Firebase user object
      firebaseUser = {
        uid: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        email,
        displayName: name,
        emailVerified: false
      };
    }

    // Create MongoDB user
    const user = await User.create({
      firebaseUid: firebaseUser.uid,
      name,
      email,
      role,
      phone,
      preferredLanguage: preferredLanguage || 'english',
      emailVerified: firebaseUser.emailVerified || false
    });

    // Create role-specific profile
    if (role === 'patient') {
      let caregiverUser = null;

      // Link to caregiver via caregiverCode (caregiver's user ID)
      if (caregiverCode) {
        caregiverUser = await User.findOne({ _id: caregiverCode, role: 'caregiver' });
        if (caregiverUser) {
          await Caregiver.findOneAndUpdate(
            { user: caregiverUser._id },
            { $addToSet: { patients: user._id } }
          );
        }
      }

      await Patient.create({
        user: user._id,
        caregiver: caregiverUser ? caregiverUser._id : null
      });
    } else if (role === 'caregiver') {
      await Caregiver.create({ user: user._id });
    }

    // Generate Firebase custom token for immediate login (or mock token)
    let customToken;
    try {
      customToken = await admin.auth().createCustomToken(firebaseUser.uid);
    } catch (err) {
      console.warn('Could not create custom token:', err.message);
      // Create a simple mock token for dev
      customToken = `mock-token-${firebaseUser.uid}`;
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Welcome to DementiaCare+!',
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        name: user.name,
        email: user.email,
        role: user.role
      },
      customToken
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration: ' + err.message });
  }
};

// @desc    Login user (handled by Firebase client SDK)
// @route   POST /api/auth/login
// @access  Public (for backend verification if needed)
const login = async (req, res) => {
  try {
    // This endpoint is primarily for backend verification
    // Frontend should use Firebase SDK for actual login
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: 'ID token required.' });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated.' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Login verified.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        firebaseUid: user.firebaseUid
      }
    });
  } catch (err) {
    console.error('Login verification error:', err);
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.userId });

    let profile = null;
    if (user.role === 'patient') {
      profile = await Patient.findOne({ user: user._id })
        .populate('caregiver', 'name email phone');
    } else if (user.role === 'caregiver') {
      profile = await Caregiver.findOne({ user: user._id })
        .populate('patients', 'name email phone');
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        preferredLanguage: user.preferredLanguage,
        emailVerified: user.emailVerified,
        lastLogin: user.lastLogin
      },
      profile
    });
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Update language preference
// @route   PATCH /api/auth/language
// @access  Private
const updateLanguage = async (req, res) => {
  try {
    const { preferredLanguage } = req.body;
    const validLangs = ['english', 'assamese', 'bengali', 'bodo', 'manipuri', 'nagamese', 'mizo', 'khasi'];

    if (!validLangs.includes(preferredLanguage)) {
      return res.status(400).json({ success: false, message: 'Invalid language selection.' });
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid: req.userId },
      { preferredLanguage },
      { new: true }
    );

    res.json({ success: true, message: 'Language preference updated.', preferredLanguage });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Update email (must verify new email in Firebase)
// @route   PATCH /api/auth/email
// @access  Private
const updateEmail = async (req, res) => {
  try {
    const { newEmail } = req.body;

    // Check if new email already exists
    const existingEmail = await User.findOne({ email: newEmail });
    if (existingEmail && existingEmail.firebaseUid !== req.userId) {
      return res.status(400).json({ success: false, message: 'Email already in use.' });
    }

    // Update in Firebase
    try {
      await admin.auth().updateUser(req.userId, { email: newEmail });
    } catch (firebaseError) {
      return res.status(400).json({ 
        success: false, 
        message: `Firebase update failed: ${firebaseError.message}` 
      });
    }

    // Update in MongoDB
    const user = await User.findOneAndUpdate(
      { firebaseUid: req.userId },
      { email: newEmail, emailVerified: false },
      { new: true }
    );

    res.json({ success: true, message: 'Email updated. Please verify your new email.', user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Delete user account (irreversible)
// @route   DELETE /api/auth/account
// @access  Private
const deleteAccount = async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.userId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Delete from Firebase
    await admin.auth().deleteUser(req.userId);

    // Delete from MongoDB (cascade with role-specific cleanup)
    if (user.role === 'patient') {
      await Patient.deleteOne({ user: user._id });
    } else if (user.role === 'caregiver') {
      await Caregiver.deleteOne({ user: user._id });
    }

    await User.deleteOne({ firebaseUid: req.userId });

    res.json({ success: true, message: 'Account deleted successfully.' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Development-mode login (email/password with bcrypt verification)
// @route   POST /api/auth/login-dev
// @access  Public (development only)
const loginDev = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required.' });
    }

    // Find user by email (explicitly select password field for comparison)
    const user = await User.findOne({ email }).select('+password');

    // If user doesn't exist, return error (don't auto-create)
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Check if account is locked due to failed attempts
    if (user.isAccountLocked()) {
      const lockoutMinutes = Math.ceil((user.accountLockedUntil - new Date()) / 60000);
      return res.status(429).json({
        success: false,
        message: `Account locked. Try again in ${lockoutMinutes} minute(s).`
      });
    }

    // Verify password against stored hash
    const isPasswordValid = await user.matchPassword(password);
    
    if (!isPasswordValid) {
      // Increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      
      // Lock account after 5 failed attempts for 15 minutes
      if (user.failedLoginAttempts >= 5) {
        user.accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        await user.save({ validateBeforeSave: false });
        return res.status(429).json({
          success: false,
          message: 'Too many failed login attempts. Account locked for 15 minutes.'
        });
      }
      
      await user.save({ validateBeforeSave: false });
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Reset failed attempts on successful login
    await user.resetFailedAttempts();

    // Generate JWT token for development
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user._id, email: user.email, firebaseUid: user.firebaseUid },
      process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
      { expiresIn: '24h' }
    );
    
    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Login successful',
      token,  // Return JWT token (Bearer token)
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        firebaseUid: user.firebaseUid
      }
    });
  } catch (err) {
    console.error('Dev login error:', err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
};

// @desc    Development-mode registration (email/password with bcrypt hashing)
// @route   POST /api/auth/register-dev
// @access  Public (development only)
const registerDev = async (req, res) => {
  try {
    const { name, email, password, role, phone, preferredLanguage, caregiverCode } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, message: 'Name, email, and password required.' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email is already registered.' });
    }

    // Create mock Firebase user
    const mockFirebaseUid = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create MongoDB user with password (will be hashed by pre-save middleware)
    const user = await User.create({
      firebaseUid: mockFirebaseUid,
      name,
      email,
      password,  // Password will be hashed by mongoose pre-save middleware
      role: role || 'patient',
      phone: phone || '',
      preferredLanguage: preferredLanguage || 'english',
      emailVerified: true
    });

    // Create role-specific profile
    if (user.role === 'patient') {
      let caregiverUser = null;

      // Link to caregiver via caregiverCode
      if (caregiverCode) {
        caregiverUser = await User.findOne({ _id: caregiverCode, role: 'caregiver' });
        if (caregiverUser) {
          await Caregiver.findOneAndUpdate(
            { user: caregiverUser._id },
            { $addToSet: { patients: user._id } }
          );
        }
      }

      await Patient.create({
        user: user._id,
        caregiver: caregiverUser ? caregiverUser._id : null
      });
    } else if (user.role === 'caregiver') {
      await Caregiver.create({ user: user._id });
    }

    // Generate JWT token for development
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user._id, email: user.email, firebaseUid: user.firebaseUid },
      process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful. Welcome to DementiaCare+!',
      token,  // Return JWT token (Bearer token)
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Dev register error:', err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
};

module.exports = { register, login, loginDev, registerDev, getMe, updateLanguage, updateEmail, deleteAccount };
