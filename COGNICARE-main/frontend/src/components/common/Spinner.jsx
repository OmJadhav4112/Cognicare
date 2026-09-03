import React from 'react';

const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-14 h-14' };

export default function Spinner({ size = 'md', className = '' }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`rounded-full border-4 animate-spin ${sizes[size]} ${className}`}
      style={{
        borderColor: 'var(--surface-border)',
        borderTopColor: 'var(--c-primary-500)',
      }}
    />
  );
}
