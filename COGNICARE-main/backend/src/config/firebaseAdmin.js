const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin with service account key
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || 
  path.join(__dirname, '../../firebaseServiceAccountKey.json');

try {
  // Check if file exists
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Firebase service account key not found at ${serviceAccountPath}`);
  }
  
  const serviceAccount = require(serviceAccountPath);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
  
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.warn('Firebase Admin initialization warning:', error.message);
  console.warn('Firebase features will not be available. Make sure to:');
  console.warn('1. Download firebaseServiceAccountKey.json from Firebase Console');
  console.warn('2. Place it in the backend root directory');
  console.warn('3. Or set FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
}

module.exports = admin;
