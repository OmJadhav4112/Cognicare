const admin = require('../config/firebaseAdmin');
const User = require('../models/User');

// Verify Firebase ID token or JWT token (development mode)
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized. Please log in.' });
    }

    let decodedToken;
    let uid;

    // Try to verify with Firebase Admin SDK first
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
      uid = decodedToken.uid;
      console.log('[Auth] Firebase token verified for UID:', uid);
    } catch (firebaseErr) {
      // If Firebase fails, try JWT verification (development mode)
      try {
        const jwt = require('jsonwebtoken');
        decodedToken = jwt.verify(
          token,
          process.env.JWT_SECRET || 'dev-secret-key-change-in-production'
        );
        uid = decodedToken.userId;
        console.log('[Auth] JWT token verified for userId:', uid);
      } catch (jwtErr) {
        // If JWT also fails, try legacy mock tokens (backward compatibility)
        if (token.startsWith('mock-token-')) {
          console.log('[Auth] Using legacy mock token for development');
          uid = token.substring('mock-token-'.length);
        } else {
          console.warn('[Auth] All token verification methods failed:', firebaseErr.message, jwtErr.message);
          return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
        }
      }
    }

    req.userId = uid;
    req.userEmail = decodedToken?.email;

    // Fetch user from MongoDB
    const user = await User.findOne({ 
      $or: [
        { firebaseUid: uid },
        { _id: uid }
      ]
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[Auth] Token verification error:', err.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// Restrict to specific roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This action is restricted to: ${roles.join(', ')}.`
      });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
