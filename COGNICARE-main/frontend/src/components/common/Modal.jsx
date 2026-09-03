import React, { useEffect } from 'react';

/**
 * Modal — responsive dialog.
 * Uses CSS variable surfaces so dark mode works automatically.
 *
 * size: 'sm' | 'md' (default) | 'lg'
 */
export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const maxW =
    size === 'sm' ? 'max-w-sm' :
    size === 'lg' ? 'max-w-2xl' :
                    'max-w-lg';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — surface-overlay token covers light + dark automatically */}
      <div
        className={`relative w-full ${maxW} rounded-3xl shadow-xl flex flex-col max-h-[88vh] sm:max-h-[82vh] animate-fade-in`}
        style={{
          backgroundColor: 'var(--surface-overlay)',
          border: '1px solid var(--surface-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0"
          style={{ borderBottom: '1px solid var(--surface-border)' }}
        >
          <h2
            id="modal-title"
            className="text-lg font-bold pr-3"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl transition-colors"
            style={{
              backgroundColor: 'var(--c-warm-200)',
              color: 'var(--text-secondary)',
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="shrink-0 px-5 pt-3 pb-4 flex gap-3 justify-end"
            style={{ borderTop: '1px solid var(--surface-border)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
