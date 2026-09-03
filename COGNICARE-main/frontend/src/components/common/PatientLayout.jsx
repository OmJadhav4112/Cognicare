import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth }     from '../../context/AuthContext';
import { useLanguage, LanguageSelector } from '../../context/LanguageContext';
import { ThemeToggle } from '../../context/ThemeContext';
import LocationWatcher from './LocationWatcher';

export default function PatientLayout() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const NAV_ITEMS = [
    { to: '/patient',              label: t('home'),        icon: '🏠', end: true },
    { to: '/patient/games',        label: t('games'),       icon: '🧩' },
    { to: '/patient/reminders',    label: t('reminders'),   icon: '🔔' },
    { to: '/patient/voice-notes',  label: t('voice_notes'), icon: '🎙️' },
    { to: '/patient/vault',        label: t('memories'),    icon: '📸' },
    { to: '/patient/progress',     label: t('progress'),    icon: '📊' },
  ];

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--surface-base)' }}>
      {/* Invisible location watcher -- starts watchPosition in background */}
      <LocationWatcher />

      {/* Header */}
      <header className="sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            <span className="text-xl font-bold" style={{ color: 'var(--c-primary-600)' }}>
              DementiaCare+
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector className="text-xs py-1 px-2" />
            <ThemeToggle />
            <button
              onClick={() => navigate('/patient/sos')}
              className="flex items-center gap-1 bg-danger-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-xl hover:bg-danger-600 transition-colors animate-sos-ring"
              aria-label="SOS Emergency"
            >
              🆘 {t('sos')}
            </button>
            <button
              onClick={() => navigate('/patient/profile')}
              className="w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center transition-colors"
              style={{ backgroundColor: 'var(--c-primary-100)', color: 'var(--c-primary-700)' }}
              aria-label={t('profile')}
              title={user?.name}
            >
              {user?.name?.[0]?.toUpperCase() || 'P'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 pb-safe border-t-2"
        style={{ borderColor: 'var(--surface-border)' }}
        aria-label="Main navigation"
      >
        <div className="max-w-2xl mx-auto flex items-center justify-around px-1 py-1">
          {NAV_ITEMS.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => isActive ? 'nav-item-active' : 'nav-item'}
              aria-label={label}
            >
              <span className="text-xl" aria-hidden="true">{icon}</span>
              <span className="text-xs">{label}</span>
            </NavLink>
          ))}
          <button
            onClick={handleLogout}
            className="nav-item"
            style={{ color: 'var(--text-muted)' }}
            aria-label={t('logout')}
          >
            <span className="text-xl" aria-hidden="true">🚪</span>
            <span className="text-xs">{t('logout')}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
