import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PageHeader({ title, subtitle, backTo, actions, emoji }) {
  const navigate = useNavigate();

  return (
    <div className="page-title-row">
      {backTo && (
        <button
          onClick={() => navigate(backTo)}
          className="back-btn"
          aria-label="Go back"
        >
          ←
        </button>
      )}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {emoji && <span className="text-3xl" aria-hidden="true">{emoji}</span>}
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h1>
        </div>
        {subtitle && (
          <p
            className="text-base mt-0.5"
            style={{ color: 'var(--text-muted)' }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
