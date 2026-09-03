// Service worker for Firebase Cloud Messaging
// This file must be in the public folder at the root

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Initialize Firebase in service worker
firebase.initializeApp({
  apiKey: "{{ VITE_FIREBASE_API_KEY }}",
  authDomain: "{{ VITE_FIREBASE_AUTH_DOMAIN }}",
  projectId: "{{ VITE_FIREBASE_PROJECT_ID }}",
  storageBucket: "{{ VITE_FIREBASE_STORAGE_BUCKET }}",
  messagingSenderId: "{{ VITE_FIREBASE_MESSAGING_SENDER_ID }}",
  appId: "{{ VITE_FIREBASE_APP_ID }}"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message: ', payload);

  const notificationTitle = payload.notification.title || 'DementiaCare+';
  const notificationOptions = {
    body: payload.notification.body || 'You have a new notification',
    icon: '/logo.png', // Update with your app logo
    badge: '/badge-72x72.png',
    tag: 'dementiacare-notification',
    requireInteraction: false,
    data: payload.data || {}
  };

  // Special handling for SOS alerts
  if (payload.data?.type === 'sos_alert') {
    notificationOptions.requireInteraction = true;
    notificationOptions.badge = '/sos-badge.png';
  }

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked: ', event.notification);

  event.notification.close();

  const urlToOpen = '/#/caregiver/dashboard'; // Navigate to caregiver dashboard

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
      .then((clientList) => {
        // Check if app is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If not open, open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
