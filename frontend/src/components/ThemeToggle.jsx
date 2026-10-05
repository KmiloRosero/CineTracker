import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'cinetracker-theme';

function getInitialTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
  window.electronAPI?.setTheme(theme);
}

function IconSun() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  );
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => { applyTheme(theme); }, [theme]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) { applyTheme(stored); setTheme(stored); return; }
    window.electronAPI?.getTheme().then((saved) => {
      if (saved === 'light' || saved === 'dark') { applyTheme(saved); setTheme(saved); }
      else {
        const osTheme = window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        applyTheme(osTheme); setTheme(osTheme);
      }
    }).catch(() => {});
  }, []);

  function toggle() { setTheme((prev) => (prev === 'dark' ? 'light' : 'dark')); }

  const isDark = theme === 'dark';

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      {isDark ? <IconSun /> : <IconMoon />}
      <span className="theme-toggle__label">{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
}
