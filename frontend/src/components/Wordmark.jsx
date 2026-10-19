import React from 'react';

/** CineTracker wordmark: two broadcast slabs, black then green; `compact` shows just C T. */
export default function Wordmark({ size = 'md', compact = false }) {
  return (
    <span className={`wordmark wordmark--${size}${compact ? ' wordmark--compact' : ''}`} aria-label="CineTracker">
      <span className="wordmark__cine" aria-hidden="true">{compact ? 'C' : 'Cine'}</span>
      <span className="wordmark__tracker" aria-hidden="true">{compact ? 'T' : 'Tracker'}</span>
    </span>
  );
}
