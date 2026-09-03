import React from 'react';

const MAP = {
  easy:   { cls: 'diff-easy',   label: '🟢 Easy' },
  medium: { cls: 'diff-medium', label: '🟡 Medium' },
  hard:   { cls: 'diff-hard',   label: '🔴 Hard' }
};

export default function DifficultyBadge({ level }) {
  const { cls, label } = MAP[level] || MAP.easy;
  return <span className={cls}>{label}</span>;
}
