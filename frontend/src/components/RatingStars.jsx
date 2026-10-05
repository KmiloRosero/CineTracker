import React, { useState } from 'react';

export default function RatingStars({ value = 0, onChange, readonly = false, size = 'md' }) {
  const [hovered, setHovered] = useState(null);

  const displayValue = hovered ?? value;
  const filled = Math.round(displayValue / 2);

  function handleClick(starIndex) {
    if (readonly || !onChange) return;
    onChange(starIndex * 2);
  }

  return (
    <div
      className={`rating-stars rating-stars--${size}${readonly ? ' rating-stars--readonly' : ''}`}
      aria-label={`Rating: ${value} out of 10`}
      role={readonly ? 'img' : 'group'}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`rating-stars__star ${star <= filled ? 'filled' : 'empty'}`}
          aria-label={`${star * 2} out of 10`}
          disabled={readonly}
          onClick={() => handleClick(star)}
          onMouseEnter={() => !readonly && setHovered(star * 2)}
          onMouseLeave={() => !readonly && setHovered(null)}
        >
          {star <= filled ? '★' : '☆'}
        </button>
      ))}
      {!readonly && (
        <span className="rating-stars__value" aria-hidden="true">
          {value > 0 ? `${value}/10` : '—'}
        </span>
      )}
    </div>
  );
}
