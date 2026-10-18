import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'cinetracker-theme';
const EVENT = 'cinetracker-theme-change';

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

function apply(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* storage unavailable */ }
  window.electronAPI?.setTheme(theme);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: theme }));
}

/**
 * Current theme plus a setter, shared by every control that changes it
 * (sidebar toggle, Settings). Persists to localStorage and the settings table.
 */
export function useTheme() {
  const [theme, setThemeState] = useState(
    () => readStored() ?? document.documentElement.getAttribute('data-theme') ?? 'dark',
  );

  useEffect(() => {
    const onChange = (e) => setThemeState(e.detail);
    window.addEventListener(EVENT, onChange);
    if (!readStored()) {
      window.electronAPI?.getTheme().then((saved) => {
        if (saved === 'light' || saved === 'dark') apply(saved);
      }).catch(() => {});
    }
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const setTheme = useCallback((next) => apply(next), []);
  return [theme, setTheme];
}
