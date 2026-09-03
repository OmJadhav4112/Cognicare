import api from './api';
import { messaging } from '../config/firebaseConfig';

/**
 * Request permission and get FCM token
 */
export const requestNotificationPermission = async (deviceName = 'Web Browser') => {
  try {
    // Check if notifications are supported
    if (!('serviceWorker' in navigator)) {
      console.log('Service Workers not supported');
      return { success: false, error: 'Service Workers not supported' };
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return { success: false, error: 'Notification permission denied' };
    }

    // Get messaging instance
    const messagingInstance = await messaging;
    if (!messagingInstance) {
      console.log('Messaging not supported');
      return { success: false, error: 'Messaging not supported' };
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { scope: '/' }
    );
    console.log('Service Worker registered:', registration);

    // Get FCM token
    const token = await messagingInstance.getToken({
      serviceWorkerRegistration: registration,
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined
    });

    if (!token) {
      console.log('No FCM token available');
      return { success: false, error: 'Unable to get FCM token' };
    }

    // Register token with backend
    const result = await api.post('/notifications/register-token', {
      token,
      deviceName
    });

    if (result.data.success) {
      // Save token to localStorage for later unregistration
      localStorage.setItem('fcm_token', token);
      return { success: true, token };
    } else {
      return { success: false, error: result.data.message };
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Unregister FCM token
 */
export const unregisterNotifications = async () => {
  try {
    const token = localStorage.getItem('fcm_token');
    if (!token) {
      return { success: true, message: 'No token to unregister' };
    }

    const result = await api.post('/notifications/unregister-token', { token });

    localStorage.removeItem('fcm_token');
    return result.data;
  } catch (error) {
    console.error('Error unregistering notifications:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get notification preferences
 */
export const getNotificationPreferences = async () => {
  try {
    const result = await api.get('/notifications/preferences');
    return result.data;
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = async (preferences) => {
  try {
    const result = await api.patch('/notifications/preferences', preferences);
    return result.data;
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Set quiet hours
 */
export const setQuietHours = async (startTime, endTime, timezone = 'UTC', enabled = true) => {
  try {
    const result = await api.patch('/notifications/quiet-hours', {
      enabled,
      startTime,
      endTime,
      timezone
    });
    return result.data;
  } catch (error) {
    console.error('Error setting quiet hours:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Enable do-not-disturb mode
 */
export const enableDoNotDisturb = async (durationMinutes = 60) => {
  try {
    const result = await api.post('/notifications/do-not-disturb', {
      durationMinutes
    });
    return result.data;
  } catch (error) {
    console.error('Error enabling do-not-disturb:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Disable do-not-disturb mode
 */
export const disableDoNotDisturb = async () => {
  try {
    const result = await api.post('/notifications/do-not-disturb/disable');
    return result.data;
  } catch (error) {
    console.error('Error disabling do-not-disturb:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get active devices with FCM tokens
 */
export const getActiveDevices = async () => {
  try {
    const result = await api.get('/notifications/active-devices');
    return result.data;
  } catch (error) {
    console.error('Error fetching active devices:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send test notification
 */
export const sendTestNotification = async () => {
  try {
    const result = await api.post('/notifications/test');
    return result.data;
  } catch (error) {
    console.error('Error sending test notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Listen for foreground notifications
 */
export const listenForNotifications = (onNotification) => {
  messaging.then((messagingInstance) => {
    if (!messagingInstance) return;

    messagingInstance.onMessage((payload) => {
      console.log('Foreground notification received:', payload);
      onNotification(payload);
    });
  });
};

/**
 * Auto-request notification permission on app load (with user understanding)
 */
export const setupNotifications = async () => {
  try {
    // Check if user has already denied permission
    if (Notification.permission === 'denied') {
      console.log('User has denied notification permission');
      return { success: false, error: 'Notification permission denied' };
    }

    // If permission already granted, just get token
    if (Notification.permission === 'granted') {
      return await requestNotificationPermission();
    }

    // If permission not yet decided, return pending
    return { success: false, error: 'Permission not yet requested', pending: true };
  } catch (error) {
    console.error('Error setting up notifications:', error);
    return { success: false, error: error.message };
  }
};
