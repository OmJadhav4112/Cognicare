import React from 'react';

// All colours reference CSS variables so dark/light mode flip automatically.
const colorMap = {
  primary: { bg: 'var(--c-primary-100)',   text: 'var(--c-primary-800)'   },
  amber:   { bg: 'var(--c-secondary-100)', text: 'var(--c-secondary-800)' },
  green:   { bg: 'var(--c-primary-100)',   text: 'var(--c-primary-800)'   },
  rose:    { bg: 'var(--c-danger-100)',    text: 'var(--c-danger-600)'    },
  grey:    { bg: 'var(--c-warm-200)',      text: 'var(--c-warm-700)'      },
};

export default function ScoreCard({ label, value, unit = '', icon, color = 'primary' }) {
  const c = colorMap[color] || colorMap.primary;
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-1"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {icon && <span className="text-2xl" aria-hidden="true">{icon}</span>}
      <span className="text-3xl font-bold leading-none">
        {value}<span className="text-base font-medium ml-1">{unit}</span>
      </span>
      <span className="text-sm font-medium opacity-80">{label}</span>
    </div>
  );
}
