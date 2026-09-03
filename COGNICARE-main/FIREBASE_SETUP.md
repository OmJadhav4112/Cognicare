# Firebase Configuration Setup Guide

## Overview
This document describes the complete Firebase setup for DementiaCare+, including both frontend (Web SDK) and backend (Admin SDK) configurations.

## Project Details
- **Firebase Project**: cognicare-5f5b4
- **Measurement ID**: G-66KW6NGNEY
- **Messaging Sender ID**: 831589909078

---

## Frontend Configuration

### Environment Variables (.env)
Located at: `frontend/.env`

All Firebase Web SDK configuration values are stored as environment variables with `VITE_` prefix:

```env
VITE_FIREBASE_API_KEY=AIzaSyConjX4zkpdOfbKB28lpzIETUUBHPptB6U
VITE_FIREBASE_AUTH_DOMAIN=cognicare-5f5b4.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=cognicare-5f5b4
VITE_FIREBASE_STORAGE_BUCKET=cognicare-5f5b4.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=831589909078
VITE_FIREBASE_APP_ID=1:831589909078:web:b070a33024074fe956b1f7
VITE_FIREBASE_MEASUREMENT_ID=G-66KW6NGNEY
```

### Firebase Config File
Located at: `frontend/src/config/firebaseConfig.js`

This file initializes Firebase services:
- **Auth** - User authentication with persistence
- **Storage** - File/image storage for family memories
- **Messaging** - Cloud Messaging for push notifications
- **Analytics** - Usage tracking and events

All services gracefully handle unavailability with try-catch and fallback checks.

### Configuration Details

#### 1. Authentication (auth)
```javascript
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence)
```
- Enables persistent login across browser sessions
- Used in `frontend/src/context/AuthContext.jsx`
- Supports email/password and custom token flows

#### 2. Storage (storage)
```javascript
import { getStorage } from 'firebase/storage';
export const storage = getStorage(app);
```
- Stores family memory photos and documents
- Used in memory management features

#### 3. Cloud Messaging (messaging)
```javascript
import { getMessaging, isSupported } from 'firebase/messaging';
export const messaging = isSupported().then(
  (supported) => (supported ? getMessaging(app) : null)
);
```
- Optional service - gracefully handles unavailability
- Used for push notifications to caregivers
- Not critical for app functionality

#### 4. Analytics (analytics)
```javascript
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
export const analytics = isAnalyticsSupported().then(
  (supported) => { if (supported) return getAnalytics(app); }
);
```
- Optional service - gracefully handles unavailability
- Tracks user engagement and feature usage
- Not critical for app functionality

---

## Backend Configuration

### Environment Variables (.env)
Located at: `backend/.env`

Firebase Admin SDK configuration:

```env
FIREBASE_PROJECT_ID=cognicare-5f5b4
FIREBASE_PROJECT_NAME=cognicare-5f5b4
FIREBASE_STORAGE_BUCKET=cognicare-5f5b4.firebasestorage.app
FIREBASE_SERVICE_ACCOUNT_KEY=./firebaseServiceAccountKey.json
FIREBASE_FCM_SERVER_KEY=fake-fcm-key-for-dev
```

### Service Account Key
**Important**: The Firebase Admin SDK requires a service account key to verify ID tokens and perform administrative operations.

**Location**: `backend/firebaseServiceAccountKey.json`

**To obtain**:
1. Go to Firebase Console: https://console.firebase.google.com/
2. Select project: cognicare-5f5b4
3. Navigate to: Project Settings > Service Accounts > Firebase Admin SDK
4. Click "Generate New Private Key"
5. Save the JSON file to `backend/firebaseServiceAccountKey.json`

**Development Mode**: If the key is not available, the app gracefully falls back to mock token authentication, allowing full development without Firebase Admin SDK.

### Configuration Details

#### 1. Authentication Verification
```javascript
const decodedToken = await admin.auth().verifyIdToken(idToken);
```
- Verifies Firebase ID tokens from frontend
- Extracts user UID for database lookup
- Falls back to mock token handling in dev mode

#### 2. User Creation (Registration)
```javascript
const firebaseUser = await admin.auth().createUser({
  email,
  password,
  displayName: name
});
```
- Creates Firebase Authentication user
- Falls back to local user creation if Firebase unavailable

#### 3. Cloud Messaging (Optional)
```javascript
FIREBASE_FCM_SERVER_KEY=your-fcm-server-key
```
- Used for sending push notifications to patients/caregivers
- Optional for basic app functionality
- For production: Get from Firebase Console > Cloud Messaging settings

#### 4. Storage Bucket
```env
FIREBASE_STORAGE_BUCKET=cognicare-5f5b4.firebasestorage.app
```
- Used for secure file access
- Not required for basic app functionality

---

## Development Mode (No Firebase Admin SDK)

When `firebaseServiceAccountKey.json` is not available:

1. **Frontend** → Attempts Firebase login/registration
2. **Frontend** → Falls back to dev endpoints if Firebase fails
3. **Backend** → `/auth/register-dev` and `/auth/login-dev` endpoints
4. **Backend** → Creates mock tokens for development
5. **Middleware** → Accepts mock tokens in format: `mock-token-<userId>`

This allows full development without Firebase credentials.

---

## Production Deployment

### Required Setup:
1. **Firebase Admin SDK Key**: Place `firebaseServiceAccountKey.json` in backend root
2. **Environment Variables**: Update `.env` for production values
3. **CORS Configuration**: Update backend CORS to match production domain
4. **Firebase Console**: Enable required services:
   - Authentication (Email/Password)
   - Cloud Storage
   - Cloud Messaging (optional)
   - Analytics (optional)

### Security Checklist:
- [ ] `firebaseServiceAccountKey.json` is in `.gitignore` and NOT committed
- [ ] Environment variables are set on production server
- [ ] HTTPS enforced for all Firebase communications
- [ ] Firebase Security Rules configured in Console
- [ ] Service account has minimal required permissions
- [ ] Regular key rotation schedule established

---

## Testing Firebase Configuration

### Frontend:
```bash
cd frontend
npm run dev
# Open http://localhost:5173
# Try: Register → Login → View Console (F12) for Firebase logs
```

### Backend:
```bash
cd backend
npm run dev
# Logs will show Firebase initialization status
# If key missing: "Firebase features will not be available"
# Fall back to dev endpoints works automatically
```

### API Endpoints:

#### Production (with Firebase):
- `POST /api/auth/register` - Register with Firebase
- `POST /api/auth/login` - Login with Firebase token
- `GET /api/auth/me` - Fetch authenticated user

#### Development (without Firebase):
- `POST /api/auth/register-dev` - Create user (auto-creates if needed)
- `POST /api/auth/login-dev` - Login with email/password
- Both generate mock tokens automatically

---

## Troubleshooting

### Issue: "Firebase features will not be available"
- **Cause**: Missing `firebaseServiceAccountKey.json` in backend root
- **Solution**: This is normal for development. App will use mock auth.
- **For Production**: Download key from Firebase Console

### Issue: Login page stuck
- **Cause**: Firebase fails AND dev endpoints not working
- **Solution**: Check backend logs for `/auth/login-dev` endpoint errors
- **Check**: Backend is running on `http://localhost:5000`

### Issue: "Invalid or expired token"
- **Cause**: Token verification failing in middleware
- **Solution**: In dev mode, ensure token format is `mock-token-<userId>`
- **Check**: Console logs show token format

### Issue: Analytics not working
- **Note**: Analytics is optional and gracefully disabled if unavailable
- **Solution**: This does not affect core functionality
- **Optional**: Can be enabled after main auth flow works

---

## Environment Variable Reference

### Frontend (VITE_FIREBASE_*)
| Variable | Purpose | Source |
|----------|---------|--------|
| VITE_FIREBASE_API_KEY | Web SDK authentication | Firebase Console |
| VITE_FIREBASE_AUTH_DOMAIN | Authentication domain | Firebase Console |
| VITE_FIREBASE_PROJECT_ID | Project identifier | Firebase Console |
| VITE_FIREBASE_STORAGE_BUCKET | Cloud Storage bucket | Firebase Console |
| VITE_FIREBASE_MESSAGING_SENDER_ID | FCM sender ID | Firebase Console |
| VITE_FIREBASE_APP_ID | Web app ID | Firebase Console |
| VITE_FIREBASE_MEASUREMENT_ID | Analytics ID | Firebase Console |

### Backend (FIREBASE_*)
| Variable | Purpose | Source |
|----------|---------|--------|
| FIREBASE_PROJECT_ID | Admin SDK project ID | Firebase Console |
| FIREBASE_PROJECT_NAME | Display name | Firebase Console |
| FIREBASE_STORAGE_BUCKET | Storage bucket URL | Firebase Console |
| FIREBASE_SERVICE_ACCOUNT_KEY | Admin credentials | Firebase Console (Private Key) |
| FIREBASE_FCM_SERVER_KEY | Push notification key | Firebase Console (Cloud Messaging) |

---

## Security Notes

1. **Never commit sensitive files**:
   - `backend/firebaseServiceAccountKey.json` (already in .gitignore)
   - `.env` files with real credentials (for production)

2. **API Keys are public by design**:
   - Frontend `VITE_FIREBASE_*` values are visible to client
   - Security relies on Firebase Security Rules, not key secrecy
   - Restrict API key usage in Firebase Console if needed

3. **Service Account Key is private**:
   - Backend `firebaseServiceAccountKey.json` gives admin access
   - Never expose to frontend
   - Rotate regularly in production
   - Store in secure vault (AWS Secrets Manager, Hashicorp Vault, etc.)

4. **Development Mode Security**:
   - Mock tokens are for development only
   - Do not use in production
   - Disable dev endpoints in production build

---

## Next Steps

1. ✅ Frontend `.env` configured with all Firebase credentials
2. ✅ Frontend Firebase config file updated with analytics
3. ✅ Backend `.env` with Firebase Admin configuration
4. ⚠️ **TODO**: Download `firebaseServiceAccountKey.json` from Firebase Console for production
5. ⚠️ **TODO**: Test full authentication flow (register → login → profile)
6. ⚠️ **TODO**: Enable Firebase Services in Console as needed

For questions, see Firebase documentation: https://firebase.google.com/docs
