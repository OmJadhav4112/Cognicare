import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate that required Firebase config exists
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);
if (missingKeys.length > 0) {
  console.error('Missing required Firebase configuration:', missingKeys);
  throw new Error(`Firebase configuration incomplete. Missing: ${missingKeys.join(', ')}`);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and enable persistence
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence)
  .catch((error) => console.error('Firebase persistence error:', error));

// Initialize Firebase Storage
export const storage = getStorage(app);

// Initialize Firebase Cloud Messaging (if supported)
export const messaging = isSupported().then(
  (supported) => (supported ? getMessaging(app) : null)
).catch(() => null);

// Initialize Firebase Analytics (if supported)
export const analytics = isAnalyticsSupported().then(
  (supported) => {
    if (supported) {
      return getAnalytics(app);
    }
    return null;
  }
).catch((error) => {
  console.error('Firebase analytics initialization error:', error);
  return null;
});

export default app;

