import React from 'react';
import { useAuth } from '../context/AuthContext';

function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  );
}

/** Empty state shown to guests on pages that need an account's data. */
export default function GuestPrompt({ title, message, onLoggedIn }) {
  const { openLoginModal } = useAuth();

  return (
    <div className="guest-prompt" role="status">
      <div className="guest-prompt__icon-wrap"><IconLock /></div>
      <h2 className="guest-prompt__title">{title}</h2>
      <p>{message}</p>
      <button className="btn btn--primary" onClick={() => openLoginModal(onLoggedIn)}>
        Log in or create an account
      </button>
    </div>
  );
}
