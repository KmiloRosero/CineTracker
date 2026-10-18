import React from 'react';

/** CineTracker wordmark: two broadcast slabs, black then green. */
export default function Wordmark({ size = 'md' }) {
  return (
    <span className={`wordmark wordmark--${size}`} aria-label="CineTracker">
      <span className="wordmark__cine" aria-hidden="true">Cine</span>
      <span className="wordmark__tracker" aria-hidden="true">Tracker</span>
    </span>
  );
}
