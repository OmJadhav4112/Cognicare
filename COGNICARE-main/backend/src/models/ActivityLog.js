const mongoose = require('mongoose');
const crypto = require('crypto');

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  firebaseUid: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: [
      'login',
      'logout',
      'register',
      'gamePlay',
      'gameSubmit',
      'reminderAcknowledge',
      'reminderCreate',
      'reminderUpdate',
      'reminderDelete',
      'noteCreate',
      'noteUpdate',
      'noteDelete',
      'memoryCreate',
      'memoryUpdate',
      'memoryDelete',
      'sosAlert',
      'sosAcknowledge',
      'sosResolve',
      'profileUpdate',
      'languageChange',
      'emailUpdate',
      'passwordChange',
      'accountDelete',
      'caregiverLink',
      'caregiverUnlink',
      'feedbackSubmit',
      'dataExport',
      'dataAccess',
      'piiAccess',
      'other'
    ],
    required: true,
    index: true
  },
  // What resource was affected
  resource: {
    type: String,
    enum: [
      'user',
      'patient',
      'caregiver',
      'game',
      'reminder',
      'note',
      'memory',
      'sosAlert',
      'feedback',
      'auth',
      'pii',
      'medicalData'
    ]
  },
  // Reference to affected resource ID
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  // Additional details about the action
  details: {
    gameType: String,           // e.g. 'memoryMatching'
    gameDifficulty: String,     // e.g. 'easy'
    reminderType: String,       // e.g. 'medicine'
    status: String,             // e.g. 'success', 'failed'
    ipAddress: String,
    userAgent: String,
    deviceInfo: String,         // e.g. 'Chrome on Windows'
    dataAccessType: String,     // 'read', 'write', 'delete'
    dataClassification: String  // 'public', 'internal', 'confidential', 'restricted'
  },
  // HIPAA Compliance Tracking
  hipaaCompliance: {
    isHIPAARelevant: {
      type: Boolean,
      default: false
    },
    piiAccessed: [{
      type: String,
      enum: ['name', 'email', 'phone', 'dateOfBirth', 'address', 'medicalNotes'],
      default: []
    }],
    medicalDataAccessed: {
      type: Boolean,
      default: false
    },
    dataClassification: {
      type: String,
      enum: ['public', 'internal', 'confidential', 'restricted'],
      default: 'internal'
    },
    encryptionUsed: {
      type: Boolean,
      default: false
    },
    auditVerified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: String  // Admin user ID or system
    },
    verifiedAt: Date,
    complianceNotes: String
  },
  
  // For error tracking
  errorMessage: {
    type: String
  },
  // For analytics
  duration: {
    type: Number // milliseconds, if applicable
  },
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  
  // Integrity hash for audit trail verification
  integrityHash: String
}, { timestamps: true, expireAfterSeconds: 7776000 }); // Auto-delete after 90 days for compliance

// Pre-save: Generate integrity hash
activityLogSchema.pre('save', function(next) {
  const dataToHash = JSON.stringify({
    user: this.user,
    action: this.action,
    resource: this.resource,
    createdAt: this.createdAt
  });
  this.integrityHash = crypto.createHash('sha256').update(dataToHash).digest('hex');
  next();
});

// Index for common queries
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ firebaseUid: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ resource: 1, resourceId: 1 });
activityLogSchema.index({ createdAt: 1 }); // For TTL
activityLogSchema.index({ 'hipaaCompliance.isHIPAARelevant': 1 }); // For compliance queries
activityLogSchema.index({ 'hipaaCompliance.auditVerified': 1 });

// Static method: Get HIPAA-relevant logs
activityLogSchema.statics.getHIPAALogs = function(userId, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.find({
    user: userId,
    'hipaaCompliance.isHIPAARelevant': true,
    createdAt: { $gte: startDate }
  }).sort({ createdAt: -1 });
};

// Static method: Verify audit trail integrity
activityLogSchema.statics.verifyAuditTrail = function(startDate, endDate) {
  return this.find({
    createdAt: { $gte: startDate, $lte: endDate }
  }).sort({ createdAt: 1 });
};

// Instance method: Verify integrity
activityLogSchema.methods.verifyIntegrity = function() {
  const dataToHash = JSON.stringify({
    user: this.user,
    action: this.action,
    resource: this.resource,
    createdAt: this.createdAt
  });
  const computedHash = crypto.createHash('sha256').update(dataToHash).digest('hex');
  return computedHash === this.integrityHash;
};

module.exports = mongoose.model('ActivityLog', activityLogSchema);
