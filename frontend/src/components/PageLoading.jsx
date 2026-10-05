import React from 'react';

function Spinner() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

export function PageLoading({ message = 'Loading…' }) {
  return (
    <main className="page-loading" role="status" aria-label={message}>
      <Spinner />
      <span>{message}</span>
    </main>
  );
}

export function PageError({ message, onRetry }) {
  return (
    <main className="page-error" role="alert">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{message}</span>
      {onRetry && (
        <button className="btn btn--ghost btn--sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </main>
  );
}
