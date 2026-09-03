const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Unique device identifier (can be generated client-side)
  deviceId: {
    type: String,
    required: true
  },
  deviceName: {
    type: String,
    default: 'Unknown Device'
  },
  // Browser/app info
  userAgent: {
    type: String
  },
  // Device platform
  platform: {
    type: String,
    enum: ['Windows', 'macOS', 'Linux', 'iOS', 'Android', 'Unknown'],
    default: 'Unknown'
  },
  // Browser/app name
  browserName: {
    type: String // Chrome, Firefox, Safari, etc.
  },
  // IP address from login
  ipAddress: {
    type: String
  },
  // Device location (if available)
  location: {
    latitude: Number,
    longitude: Number,
    city: String,
    country: String
  },
  // Session timing
  loginTime: {
    type: Date,
    default: Date.now
  },
  lastActivityTime: {
    type: Date,
    default: Date.now
  },
  logoutTime: {
    type: Date
  },
  // Session status
  isActive: {
    type: Boolean,
    default: true
  },
  // Expiration
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  },
  // Track session activity count
  activityCount: {
    type: Number,
    default: 0
  },
  // Session token (if using custom tokens)
  sessionToken: {
    type: String
  }
}, { timestamps: true });

// Index for common queries
userSessionSchema.index({ firebaseUid: 1, isActive: 1 });
userSessionSchema.index({ user: 1, isActive: 1 });
userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
userSessionSchema.index({ deviceId: 1 });
userSessionSchema.index({ lastActivityTime: -1 });

// Static method: Get active sessions for a user
userSessionSchema.statics.getActiveSessions = function (userId, limit = 5) {
  return this.find({ user: userId, isActive: true })
    .sort({ lastActivityTime: -1 })
    .limit(limit);
};

// Static method: Logout all sessions for a user
userSessionSchema.statics.logoutAllSessions = function (userId) {
  return this.updateMany(
    { user: userId, isActive: true },
    { isActive: false, logoutTime: new Date() }
  );
};

// Static method: Logout all except current device
userSessionSchema.statics.logoutOtherDevices = function (userId, currentDeviceId) {
  return this.updateMany(
    { user: userId, deviceId: { $ne: currentDeviceId }, isActive: true },
    { isActive: false, logoutTime: new Date() }
  );
};

// Instance method: Update last activity
userSessionSchema.methods.updateActivity = function () {
  this.lastActivityTime = new Date();
  this.activityCount += 1;
  return this.save();
};

// Instance method: Close session
userSessionSchema.methods.closeSession = function () {
  this.isActive = false;
  this.logoutTime = new Date();
  return this.save();
};

module.exports = mongoose.model('UserSession', userSessionSchema);
