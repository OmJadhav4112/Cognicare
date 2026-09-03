const admin = require('../config/firebaseAdmin');
const NotificationPreference = require('../models/NotificationPreference');
const ActivityLog = require('../models/ActivityLog');

/**
 * Send push notification via Firebase Cloud Messaging
 */
const sendPushNotification = async (userId, title, body, data = {}, notificationType = 'general') => {
  try {
    const prefs = await NotificationPreference.findOne({ caregiver: userId });
    
    if (!prefs) {
      console.log(`No notification preferences found for user ${userId}`);
      return { success: false, error: 'Notification preferences not configured' };
    }
    
    // Check if can send notification
    if (!prefs.canSendNotification(notificationType)) {
      console.log(`Cannot send ${notificationType} notification - quiet hours or DND enabled`);
      return { success: false, error: 'Notification blocked by user preferences' };
    }
    
    // Get enabled channels for this notification type
    const channels = prefs.getEnabledChannels(notificationType);
    if (!channels.includes('push') || !prefs.fcmTokens || prefs.fcmTokens.length === 0) {
      console.log(`Push notifications not enabled for user ${userId}`);
      return { success: false, error: 'Push notifications not enabled' };
    }
    
    const results = [];
    const validTokens = [];
    
    // Send to all registered devices
    for (const fcmToken of prefs.fcmTokens) {
      try {
        const message = {
          notification: {
            title,
            body
          },
          data,
          token: fcmToken.token
        };
        
        const response = await admin.messaging().send(message);
        results.push({ token: fcmToken.token, messageId: response, status: 'success' });
        validTokens.push(fcmToken.token);
      } catch (error) {
        console.error(`Failed to send to token ${fcmToken.token}:`, error.message);
        
        // If token is invalid, mark for removal
        if (error.code === 'messaging/invalid-registration-token' || 
            error.code === 'messaging/registration-token-not-registered') {
          results.push({ token: fcmToken.token, status: 'invalid-token' });
        } else {
          results.push({ token: fcmToken.token, error: error.message, status: 'failed' });
          validTokens.push(fcmToken.token);
        }
      }
    }
    
    // Clean up invalid tokens
    const invalidTokens = prefs.fcmTokens
      .filter(ft => !validTokens.includes(ft.token))
      .map(ft => ft.token);
    
    if (invalidTokens.length > 0) {
      await NotificationPreference.findByIdAndUpdate(prefs._id, {
        $pull: { fcmTokens: { token: { $in: invalidTokens } } }
      });
    }
    
    // Update notification stats
    await NotificationPreference.findByIdAndUpdate(prefs._id, {
      totalNotificationsSent: (prefs.totalNotificationsSent || 0) + 1,
      lastNotificationSent: new Date()
    });
    
    return {
      success: results.some(r => r.status === 'success'),
      results,
      sentCount: results.filter(r => r.status === 'success').length
    };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send SOS alert to caregiver
 */
const sendSOSAlert = async (caregiverId, patientName, patientId, message) => {
  try {
    const result = await sendPushNotification(
      caregiverId,
      '🚨 SOS Alert!',
      `${patientName} needs immediate assistance`,
      {
        type: 'sos_alert',
        patientId: patientId.toString(),
        patientName,
        message,
        timestamp: new Date().toISOString()
      },
      'emergency'
    );
    
    // Log the notification attempt
    await ActivityLog.create({
      user: caregiverId,
      firebaseUid: null, // Will be populated separately if needed
      action: 'sosAlert',
      resource: 'sosAlert',
      resourceId: patientId,
      details: {
        patientName,
        notificationsSent: result.sentCount || 0,
        success: result.success
      }
    });
    
    return result;
  } catch (error) {
    console.error('Error sending SOS alert:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send game milestone notification
 */
const sendGameMilestoneNotification = async (caregiverId, patientName, milestone, details = {}) => {
  try {
    const milestoneMessages = {
      '7dayStreak': '🔥 7-day streak!',
      '30dayStreak': '🎉 30-day streak!',
      'levelUpMemory': '📈 Memory level up!',
      'levelUpAttention': '👁️ Attention level up!',
      'levelUpPattern': '🧩 Pattern recognition improved!',
      '1000GamesPlayed': '🏆 1000 games played!',
      'consistentHighScore': '⭐ Consistent high scores!'
    };
    
    const result = await sendPushNotification(
      caregiverId,
      milestoneMessages[milestone] || 'Achievement Unlocked!',
      `${patientName} achieved: ${milestone}`,
      {
        type: 'game_milestone',
        milestone,
        patientName,
        ...details
      },
      'gameMilestone'
    );
    
    return result;
  } catch (error) {
    console.error('Error sending milestone notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send low engagement alert
 */
const sendLowEngagementAlert = async (caregiverId, patientName, daysSinceActivity) => {
  try {
    const result = await sendPushNotification(
      caregiverId,
      '⚠️ Low Engagement Alert',
      `${patientName} hasn't played games in ${daysSinceActivity} days`,
      {
        type: 'low_engagement',
        patientName,
        daysSinceActivity
      },
      'lowEngagement'
    );
    
    return result;
  } catch (error) {
    console.error('Error sending low engagement alert:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send performance report to caregiver
 */
const sendPerformanceReport = async (caregiverId, patientName, metrics) => {
  try {
    const report = `Memory: ${metrics.memoryScore}% | Attention: ${metrics.attentionScore}% | Pattern: ${metrics.patternScore}%`;
    
    const result = await sendPushNotification(
      caregiverId,
      '📊 Weekly Performance Report',
      report,
      {
        type: 'performance_report',
        patientName,
        memoryScore: metrics.memoryScore,
        attentionScore: metrics.attentionScore,
        patternScore: metrics.patternScore
      },
      'performanceReport'
    );
    
    return result;
  } catch (error) {
    console.error('Error sending performance report:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send email notification (placeholder - implement with email service like SendGrid)
 */
const sendEmailNotification = async (email, subject, htmlBody) => {
  try {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`Email notification would be sent to ${email}: ${subject}`);
    return { success: true, method: 'email', queued: true };
  } catch (error) {
    console.error('Error sending email notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send SMS notification (placeholder - implement with SMS service like Twilio)
 */
const sendSMSNotification = async (phoneNumber, message) => {
  try {
    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log(`SMS notification would be sent to ${phoneNumber}: ${message}`);
    return { success: true, method: 'sms', queued: true };
  } catch (error) {
    console.error('Error sending SMS notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Register FCM token for device
 */
const registerFCMToken = async (userId, token, deviceName = 'Unknown Device') => {
  try {
    const prefs = await NotificationPreference.findOneAndUpdate(
      { caregiver: userId },
      {
        $addToSet: {
          fcmTokens: {
            token,
            deviceName,
            createdAt: new Date()
          }
        }
      },
      { new: true }
    );
    
    if (!prefs) {
      // Create notification preferences if not exists
      const newPrefs = await NotificationPreference.create({
        caregiver: userId,
        fcmTokens: [{
          token,
          deviceName,
          createdAt: new Date()
        }]
      });
      return { success: true, message: 'FCM token registered', prefs: newPrefs };
    }
    
    return { success: true, message: 'FCM token registered', prefs };
  } catch (error) {
    console.error('Error registering FCM token:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Unregister FCM token (user logged out from device)
 */
const unregisterFCMToken = async (userId, token) => {
  try {
    const result = await NotificationPreference.findOneAndUpdate(
      { caregiver: userId },
      { $pull: { fcmTokens: { token } } },
      { new: true }
    );
    
    return { success: true, message: 'FCM token removed', result };
  } catch (error) {
    console.error('Error unregistering FCM token:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPushNotification,
  sendSOSAlert,
  sendGameMilestoneNotification,
  sendLowEngagementAlert,
  sendPerformanceReport,
  sendEmailNotification,
  sendSMSNotification,
  registerFCMToken,
  unregisterFCMToken
};
