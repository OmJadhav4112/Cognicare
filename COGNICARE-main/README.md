# 🧠 DementiaCare+

**AI-powered cognitive gaming and memory assistance platform for elderly people in North East India (NER)**

DementiaCare+ is a supportive companion platform — not a medical diagnosis tool. It connects elderly patients with their caregivers through personalised cognitive activities, family memory sharing, and real-time monitoring.

---

## ✨ Key Features

### For Patients
| Feature | Description |
|---|---|
| 🎮 **Cognitive Games** | Memory Matching, Picture Recall, Sequence Memory, Pattern Attention |
| 🌿 **NER Cultural Content** | Games use locally familiar items — Bihu, Jaapi, Kaziranga, Assamese food, and more |
| 🤖 **AI Personalisation** | Difficulty adapts automatically based on performance history |
| 📸 **Family Memory Vault** | Browse family photos, names, relationships, and special memories |
| 🔔 **Reminders** | Medicine, meals, appointments, water — managed by caregiver |
| 📝 **Notes & Tasks** | Coloured sticky notes with pin and task completion |
| 🆘 **SOS Alert** | One-tap emergency alert to caregiver with two-step confirmation |
| 📊 **Progress View** | Weekly activity charts and engagement summary |
| 🌐 **Language Selection** | English, Assamese, Bengali, Bodo, Manipuri, Nagamese, Mizo, Khasi |

### For Caregivers
| Feature | Description |
|---|---|
| 👴 **Patient Monitoring** | Cognitive profile, difficulty levels, recent game sessions |
| 🤖 **AI Insights** | Ranked activity recommendations with plain-language reasons |
| ⚡ **Apply Difficulty** | One-tap to apply AI-suggested difficulty adjustments |
| 🔔 **Manage Reminders** | Full CRUD — type, time, days, enable/disable |
| 📸 **Memory Vault Management** | Add photos, family members, hints, mark favourites |
| 💬 **Feedback** | Mood observations, game preferences, difficulty feedback — feeds AI |
| 🆘 **SOS Alerts** | Receive, acknowledge, and resolve emergency alerts |

---

## 🏗️ Architecture

```
DementiaCare/
├── backend/                  # Node.js + Express API
│   └── src/
│       ├── models/           # Mongoose schemas
│       ├── routes/           # Express routers
│       ├── controllers/      # Business logic
│       ├── middleware/        # JWT auth, role guards
│       ├── services/         # AI engine
│       ├── data/             # NER cultural content
│       └── utils/            # DB connection, token helpers
│
└── frontend/                 # React 18 + Vite + Tailwind
    └── src/
        ├── pages/
        │   ├── auth/         # Login, Register
        │   ├── patient/      # Dashboard, Games, Reminders, Notes, SOS, Vault, Progress
        │   └── caregiver/    # Dashboard, Monitor, Reminders, Memories, Feedback, AI Insights
        ├── components/
        │   ├── common/       # Layout, Modal, Toast, Spinner, Badges
        │   └── games/        # GameResult, GameTimer
        ├── context/          # AuthContext
        ├── services/         # API service layer
        ├── hooks/            # useFetch
        └── data/             # NER content (frontend copy)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

**Backend** — copy `.env.example` to `.env`:
```bash
cd backend
copy .env.example .env   # Windows
# or: cp .env.example .env  (Mac/Linux)
```

Edit `backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/dementiacare
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Firebase Configuration — See FIREBASE_SETUP.md for complete guide
VITE_FIREBASE_API_KEY=AIzaSyConjX4zkpdOfbKB28lpzIETUUBHPptB6U
VITE_FIREBASE_AUTH_DOMAIN=cognicare-5f5b4.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=cognicare-5f5b4
VITE_FIREBASE_STORAGE_BUCKET=cognicare-5f5b4.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=831589909078
VITE_FIREBASE_APP_ID=1:831589909078:web:b070a33024074fe956b1f7
VITE_FIREBASE_MEASUREMENT_ID=G-66KW6NGNEY
```

**Firebase Backend** — also copy backend `.env.example`:
```bash
cd backend
copy .env.example .env
```

Edit `backend/.env` and ensure these Firebase values are present:
```env
FIREBASE_PROJECT_ID=cognicare-5f5b4
FIREBASE_STORAGE_BUCKET=cognicare-5f5b4.firebasestorage.app
FIREBASE_SERVICE_ACCOUNT_KEY=./firebaseServiceAccountKey.json  # Download from Firebase Console
```

> **Note**: The app works in **development mode without Firebase credentials**. Both frontend and backend gracefully fall back to local authentication. For production, download `firebaseServiceAccountKey.json` from Firebase Console — see **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** for complete instructions.

### 3. Start MongoDB

```bash
# If running locally:
mongod
```

Or use a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster and paste the connection string into `MONGO_URI`.

### 4. Run the App

Open **two terminals**:

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# Server starts on http://localhost:5000

# Terminal 2 — Frontend
cd frontend
npm run dev
# App opens on http://localhost:5173
```

---

## 🔗 Linking a Patient and Caregiver

1. **Caregiver registers** first at `/register` → role: Caregiver
2. After login, the caregiver's **User ID** is shown on their dashboard
3. **Patient registers** at `/register` → role: Patient → pastes the caregiver's User ID in the "Caregiver ID" field
4. Accounts are now linked — the caregiver can manage the patient's reminders, memories, and view AI insights

---

## 🌿 NER Cultural Content

Games use 50+ culturally familiar items from North East India:

| Category | Examples |
|---|---|
| 🍚 Foods | Pitha, Bamboo Shoot, Fish Tenga, Eromba, Jadoh |
| 🎊 Festivals | Bihu, Hornbill Festival, Sangai, Chapchar Kut, Wangala |
| 🏞️ Landmarks | Kamakhya Temple, Kaziranga, Loktak Lake, Tawang Monastery |
| 👘 Clothing | Mekhela Chador, Muga Silk, Naga Shawl, Phanek |
| 🌸 Plants | Foxtail Orchid, Bamboo, Rhododendron, Tea Plant |
| 🦏 Animals | One-Horned Rhino, Sangai Deer, Great Hornbill, River Dolphin |
| 🥁 Objects | Dhol, Jaapi, Xorai, Cane Basket, Pepa |
| 💃 Folk Arts | Bihu Dance, Sattriya, Cheraw (Bamboo Dance) |

---

## 🤖 AI Personalisation Engine

The AI engine (`backend/src/services/aiEngine.js`) is fully rule-based — no external ML APIs required.

**How it works:**
1. After each game session, the engine analyses the last 5 sessions
2. It scores each game type by: accuracy trend, score, caregiver feedback, session count
3. It recommends activities ranked by priority with plain-language reasons
4. Difficulty adjusts automatically: accuracy ≥ 85% → level up; ≤ 50% → level down
5. Caregiver feedback (game preferences, difficulty opinions) directly influences scores
6. All recommendations include an explicit disclaimer — not a medical assessment

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register patient or caregiver |
| POST | `/api/auth/login` | Login |
| GET  | `/api/auth/me` | Get current user + profile |
| GET  | `/api/patient/profile` | Patient profile |
| GET  | `/api/patient/reminders` | Today's reminders |
| POST | `/api/patient/sos` | Trigger SOS alert |
| GET  | `/api/patient/vault` | Read family memories |
| POST | `/api/games/submit` | Submit game result |
| GET  | `/api/games/stats` | Game statistics |
| GET  | `/api/ai/recommendations` | AI activity recommendations |
| GET  | `/api/ai/summary` | Performance summary |
| POST | `/api/ai/apply-difficulty` | Apply AI difficulty suggestions |
| GET  | `/api/caregiver/patients/:id/overview` | Patient monitoring data |
| POST | `/api/caregiver/patients/:id/memories` | Add family memory |
| POST | `/api/caregiver/patients/:id/feedback` | Submit caregiver feedback |
| GET  | `/api/content/game/:type` | Get NER content for a game |

---

## ⚠️ Important Disclaimer

DementiaCare+ is a **cognitive engagement and activity platform**. It does not:
- Diagnose dementia or any medical condition
- Replace professional medical care or advice
- Provide clinical assessments

All performance summaries and AI insights reflect **activity engagement only**.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6 |
| Charts | Recharts |
| HTTP | Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | express-validator |
| Security | helmet, cors, express-rate-limit |

---

## ♿ Accessibility

- Base font size 18px — enlarged for elderly readability
- All interactive elements have minimum 48px touch targets (WCAG 2.5.5)
- High-contrast focus rings on all focusable elements (WCAG 2.4.7)
- `aria-label`, `aria-live`, `role` attributes on key components
- Warm, high-contrast colour palette with 4.5:1+ contrast ratios
- Simple navigation with bottom tab bar — minimal cognitive load

---

*Built for the elderly people of North East India 🌿*
