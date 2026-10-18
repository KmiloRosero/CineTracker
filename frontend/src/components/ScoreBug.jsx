import React, { useState } from 'react';

const SEGMENTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Rating shown like a broadcast score bug: the value in a green slab and,
 * when editable, ten segments to set it (1-10).
 */
export default function ScoreBug({ value = 0, onChange, readonly = false, size = 'md', label = 'Tu puntuación' }) {
  const [hovered, setHovered] = useState(null);
  const score   = Number(value) || 0;
  const preview = hovered ?? score;
  const shown   = Number.isInteger(score) ? score : score.toFixed(1).replace('.', ',');

  if (readonly) {
    if (!score) return null;
    return (
      <span className={`score-bug score-bug--readonly score-bug--${size}`} role="img" aria-label={`Puntuación: ${shown} de 10`}>
        <span className="score-bug__value">{shown}</span>
        <span className="score-bug__max" aria-hidden="true">/10</span>
      </span>
    );
  }

  return (
    <div className={`score-bug score-bug--${size}`}>
      <span className="score-bug__slab" aria-hidden="true">
        <span className="score-bug__value">{preview || '–'}</span>
        <span className="score-bug__max">/10</span>
      </span>
      <div
        className="score-bug__segments"
        role="radiogroup"
        aria-label={label}
        onMouseLeave={() => setHovered(null)}
      >
        {SEGMENTS.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={score === n}
            aria-label={`${n} de 10`}
            className={`score-bug__segment${n <= preview ? ' is-on' : ''}`}
            onMouseEnter={() => setHovered(n)}
            onFocus={() => setHovered(n)}
            onBlur={() => setHovered(null)}
            onClick={() => onChange?.(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
