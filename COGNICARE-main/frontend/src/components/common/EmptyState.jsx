import React from 'react';

export default function EmptyState({ emoji = '📭', title, message, action }) {
  return (
    <div className="empty-state animate-fade-in">
      <span className="text-6xl" aria-hidden="true">{emoji}</span>
      <div>
        <h3 className="text-xl font-semibold" style={{ color: 'var(--text-secondary)' }}>{title}</h3>
        {message && (
          <p className="text-base mt-1" style={{ color: 'var(--text-muted)' }}>{message}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
