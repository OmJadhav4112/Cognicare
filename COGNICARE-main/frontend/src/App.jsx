import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Auth pages
import LoginPage    from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Patient pages
import PatientDashboard     from './pages/patient/PatientDashboard';
import GamesHub             from './pages/patient/GamesHub';
import MemoryMatchingGame   from './pages/patient/games/MemoryMatchingGame';
import PictureRecallGame    from './pages/patient/games/PictureRecallGame';
import SequenceMemoryGame   from './pages/patient/games/SequenceMemoryGame';
import PatternAttentionGame from './pages/patient/games/PatternAttentionGame';
import RemindersPage        from './pages/patient/RemindersPage';
import NotesPage            from './pages/patient/NotesPage';
import SOSPage              from './pages/patient/SOSPage';
import FamilyVaultPage      from './pages/patient/FamilyVaultPage';
import ProgressPage         from './pages/patient/ProgressPage';
import ProfilePage          from './pages/patient/ProfilePage';
import VoiceNotesPage       from './pages/patient/VoiceNotesPage';

// Caregiver pages
import CaregiverDashboard from './pages/caregiver/CaregiverDashboard';
import PatientMonitor     from './pages/caregiver/PatientMonitor';
import ManageReminders    from './pages/caregiver/ManageReminders';
import ManageMemories     from './pages/caregiver/ManageMemories';
import FeedbackPage       from './pages/caregiver/FeedbackPage';
import SOSAlertsPage      from './pages/caregiver/SOSAlertsPage';
import AIInsightsPage       from './pages/caregiver/AIInsightsPage';
import LocationSafetyPage   from './pages/caregiver/LocationSafetyPage';

// Layout
import PatientLayout   from './components/common/PatientLayout';
import CaregiverLayout from './components/common/CaregiverLayout';
import Spinner         from './components/common/Spinner';

// ─────────────────────────────────────────────────────────────────────────────
//  Route guards
// ─────────────────────────────────────────────────────────────────────────────

/** Requires the user to be authenticated with the given role. */
const RequireAuth = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'patient' ? '/patient' : '/caregiver'} replace />;
  }
  return children;
};

/** Redirects already-authenticated users away from login/register pages. */
const PublicOnly = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }
  if (user) {
    return <Navigate to={user.role === 'patient' ? '/patient' : '/caregiver'} replace />;
  }
  return children;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Routes
// ─────────────────────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* Default → login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public auth pages */}
      <Route path="/login"    element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />

      {/* ── Patient ──────────────────────────────────────────────────────── */}
      <Route
        path="/patient"
        element={
          <RequireAuth role="patient">
            <PatientLayout />
          </RequireAuth>
        }
      >
        <Route index              element={<PatientDashboard />} />
        <Route path="games"       element={<GamesHub />} />
        <Route path="games/memory"   element={<MemoryMatchingGame />} />
        <Route path="games/recall"   element={<PictureRecallGame />} />
        <Route path="games/sequence" element={<SequenceMemoryGame />} />
        <Route path="games/pattern"  element={<PatternAttentionGame />} />
        <Route path="reminders"  element={<RemindersPage />} />
        <Route path="notes"      element={<NotesPage />} />
        <Route path="sos"        element={<SOSPage />} />
        <Route path="vault"      element={<FamilyVaultPage />} />
        <Route path="progress"   element={<ProgressPage />} />
        <Route path="profile"    element={<ProfilePage />} />
        <Route path="voice-notes" element={<VoiceNotesPage />} />
      </Route>

      {/* ── Caregiver ────────────────────────────────────────────────────── */}
      <Route
        path="/caregiver"
        element={
          <RequireAuth role="caregiver">
            <CaregiverLayout />
          </RequireAuth>
        }
      >
        <Route index                               element={<CaregiverDashboard />} />
        <Route path="patient/:patientId"           element={<PatientMonitor />} />
        <Route path="patient/:patientId/reminders" element={<ManageReminders />} />
        <Route path="patient/:patientId/memories"  element={<ManageMemories />} />
        <Route path="patient/:patientId/feedback"  element={<FeedbackPage />} />
        <Route path="patient/:patientId/insights"  element={<AIInsightsPage />} />
        <Route path="sos"                          element={<SOSAlertsPage />} />
        <Route path="patient/:patientId/location"    element={<LocationSafetyPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

