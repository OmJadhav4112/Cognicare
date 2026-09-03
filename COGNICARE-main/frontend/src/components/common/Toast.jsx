import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

const ICONS = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

// Uses inline styles so surface variables apply in both light and dark
const TYPE_STYLES = {
  success: { bg: 'var(--c-primary-50)',    border: 'var(--c-primary-200)',   color: 'var(--c-primary-800)' },
  error:   { bg: 'var(--c-danger-50)',     border: 'var(--c-danger-400)',    color: 'var(--c-danger-600)'  },
  info:    { bg: 'var(--c-primary-50)',    border: 'var(--c-primary-200)',   color: 'var(--c-primary-800)' },
  warning: { bg: 'var(--c-secondary-50)', border: 'var(--c-secondary-300)', color: 'var(--c-secondary-700)' },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm"
        aria-live="polite"
      >
        {toasts.map(t => {
          const s = TYPE_STYLES[t.type] || TYPE_STYLES.info;
          return (
            <div
              key={t.id}
              className="flex items-start gap-3 p-4 rounded-2xl shadow-card text-base font-medium animate-fade-in"
              style={{
                backgroundColor: s.bg,
                border: `2px solid ${s.border}`,
                color: s.color,
              }}
            >
              <span className="text-xl shrink-0" aria-hidden="true">{ICONS[t.type]}</span>
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};
