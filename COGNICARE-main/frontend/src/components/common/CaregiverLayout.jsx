import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, LanguageSelector } from '../../context/LanguageContext';
import { ThemeToggle } from '../../context/ThemeContext';

export default function CaregiverLayout() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const NAV_ITEMS = [
    { to: '/caregiver',     label: t('dashboard'),  icon: '🏠', end: true },
    { to: '/caregiver/sos', label: t('sos_alerts'), icon: '🆘' },
  ];

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--surface-base)' }}>
      {/* Header — bg/border from global header {} rule in index.css */}
      <header className="sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            <div>
              <span className="text-xl font-bold" style={{ color: 'var(--c-primary-600)' }}>
                DementiaCare+
              </span>
              <span className="ml-2 badge badge-green text-xs">{t('caregiver_role')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector className="text-sm hidden sm:block" />
            <ThemeToggle />
            <span
              className="text-base font-medium hidden lg:block"
              style={{ color: 'var(--text-secondary)' }}
            >
              {user?.name}
            </span>
            <button
              onClick={handleLogout}
              className="btn-ghost btn-sm"
              aria-label={t('logout')}
            >
              🚪 {t('logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 pb-safe border-t-2"
        style={{ borderColor: 'var(--surface-border)' }}
        aria-label="Main navigation"
      >
        <div className="max-w-3xl mx-auto flex items-center justify-around px-2 py-1">
          {NAV_ITEMS.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => isActive ? 'nav-item-active' : 'nav-item'}
              aria-label={label}
            >
              <span className="text-2xl" aria-hidden="true">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
