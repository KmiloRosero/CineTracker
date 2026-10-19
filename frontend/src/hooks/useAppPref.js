import { useSyncExternalStore } from 'react';

// Per-viewer preferences shared by several components at once (the app
// shell and Perfil), kept in localStorage. Each change notifies every user
// of the same key so they stay in step.
const listeners = new Map(); // key -> Set<() => void>

function read(key, initial, allowed) {
  try {
    const stored = localStorage.getItem(key);
    return stored !== null && allowed.includes(stored) ? stored : initial;
  } catch {
    return initial;
  }
}

/** Sets a preference and notifies every component using it. */
export function setAppPref(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
  listeners.get(key)?.forEach((notify) => notify());
}

/** [value, set] for a preference limited to `allowed` values. */
export function useAppPref(key, initial, allowed) {
  const value = useSyncExternalStore(
    (notify) => {
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key).add(notify);
      return () => listeners.get(key).delete(notify);
    },
    () => read(key, initial, allowed),
  );
  return [value, (next) => setAppPref(key, next)];
}

export const BACKGROUND_PREF = ['cinetracker-background', 'animated', ['animated', 'still']];
export const INTRO_PREF = ['cinetracker-intro', 'show', ['show', 'hide']];
