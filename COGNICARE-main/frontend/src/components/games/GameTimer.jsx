import React, { useEffect, useState, useRef } from 'react';

export default function GameTimer({ running, onTick }) {
  const [seconds, setSeconds] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setSeconds(s => {
          const next = s + 1;
          onTick?.(next);
          return next;
        });
      }, 1000);
    } else {
      clearInterval(ref.current);
    }
    return () => clearInterval(ref.current);
  }, [running]);

  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-1 text-base font-semibold text-warm-600" aria-live="off">
      <span aria-hidden="true">⏱️</span>
      <span>{mins}:{secs}</span>
    </div>
  );
}
