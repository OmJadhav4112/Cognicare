const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema({
  caregiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  // SOS Alert notifications
  sosAlert: {
    enabled: {
      type: Boolean,
      default: true
    },
    channels: [{
      type: String,
      enum: ['email', 'sms', 'push', 'in-app'],
      default: ['email', 'push']
    }],
    urgency: {
      type: String,
      enum: ['immediate', 'high', 'normal'],
      default: 'immediate'
    }
  },
  
  // Low engagement notifications
  lowEngagement: {
    enabled: {
      type: Boolean,
      default: true
    },
    channels: [{
      type: String,
      enum: ['email', 'sms', 'push', 'in-app'],
      default: ['email']
    }],
    threshold: {
      type: Number, // days without activity
      default: 2
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'never'],
      default: 'weekly'
    }
  },
  
  // Game milestones & achievements
  gameMilestone: {
    enabled: {
      type: Boolean,
      default: true
    },
    channels: [{
      type: String,
      enum: ['email', 'sms', 'push', 'in-app'],
      default: ['in-app', 'email']
    }],
    milestonesToNotify: [{
      type: String,
      enum: [
        '7dayStreak',
        '30dayStreak',
        'levelUp',
        'highScore',
        'gameCompleted',
        'achievementUnlocked'
      ]
    }]
  },
  
  // Reminder notifications
  reminders: {
    enabled: {
      type: Boolean,
      default: true
    },
    channels: [{
      type: String,
      enum: ['email', 'sms', 'push', 'in-app'],
      default: ['email', 'in-app']
    }],
    reminderTypes: [{
      type: String,
      enum: ['medicine', 'meal', 'appointment', 'water', 'exercise', 'activity', 'all'],
      default: 'all'
    }],
    notifyPatientMissed: {
      type: Boolean,
      default: true
    }
  },
  
  // Performance/Cognitive score changes
  performanceReport: {
    enabled: {
      type: Boolean,
      default: true
    },
    channels: [{
      type: String,
      enum: ['email', 'sms', 'push', 'in-app'],
      default: ['email']
    }],
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'never'],
      default: 'weekly'
    },
    changeThreshold: {
      type: Number, // notify if score changes by X points
      default: 10
    }
  },
  
  // Caregiver feedback requests
  feedbackRequest: {
    enabled: {
      type: Boolean,
      default: true
    },
    channels: [{
      type: String,
      enum: ['email', 'sms', 'push', 'in-app'],
      default: ['email', 'push']
    }],
    frequency: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly', 'never'],
      default: 'weekly'
    }
  },
  
  // Quiet hours (don't send notifications during these times)
  quietHours: {
    enabled: {
      type: Boolean,
      default: true
    },
    startTime: {
      type: String, // HH:MM format
      default: '22:00'
    },
    endTime: {
      type: String, // HH:MM format
      default: '08:00'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  
  // Daily digest preference
  dailyDigest: {
    enabled: {
      type: Boolean,
      default: false
    },
    time: {
      type: String, // HH:MM format, e.g., "09:00"
      default: '09:00'
    },
    includeMetrics: {
      type: Boolean,
      default: true
    },
    includeReminders: {
      type: Boolean,
      default: true
    },
    includeAchievements: {
      type: Boolean,
      default: true
    }
  },
  
  // FCM tokens for push notifications
  fcmTokens: [{
    token: String,
    deviceName: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // SMS phone number (if SMS notifications enabled)
  smsPhoneNumber: {
    type: String
  },
  
  // Email addresses (can be multiple)
  emailAddresses: [{
    type: String
  }],
  
  // Do-not-disturb mode
  doNotDisturb: {
    enabled: {
      type: Boolean,
      default: false
    },
    until: Date
  },
  
  // Notification history
  lastNotificationSent: {
    type: Date
  },
  
  // Notification statistics
  totalNotificationsSent: {
    type: Number,
    default: 0
  },
  notificationsReadCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Indexes
notificationPreferenceSchema.index({ caregiver: 1 });
notificationPreferenceSchema.index({ 'quietHours.timezone': 1 });

// Instance method: Check if within quiet hours
notificationPreferenceSchema.methods.isWithinQuietHours = function () {
  if (!this.quietHours.enabled) return false;
  
  const now = new Date();
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                      now.getMinutes().toString().padStart(2, '0');
  
  const start = this.quietHours.startTime;
  const end = this.quietHours.endTime;
  
  if (start < end) {
    // Normal case: e.g., 08:00 - 22:00
    return currentTime >= start && currentTime <= end;
  } else {
    // Wrap around midnight: e.g., 22:00 - 08:00
    return currentTime >= start || currentTime <= end;
  }
};

// Instance method: Can send notification
notificationPreferenceSchema.methods.canSendNotification = function (notificationType = 'general') {
  // Check do-not-disturb
  if (this.doNotDisturb.enabled && this.doNotDisturb.until > new Date()) {
    return false;
  }
  
  // Check quiet hours
  if (this.isWithinQuietHours() && notificationType !== 'emergency') {
    return false;
  }
  
  return true;
};

// Instance method: Get enabled channels for notification type
notificationPreferenceSchema.methods.getEnabledChannels = function (notificationType) {
  const typeConfig = this[notificationType];
  
  if (!typeConfig || !typeConfig.enabled) {
    return [];
  }
  
  return typeConfig.channels || [];
};

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
