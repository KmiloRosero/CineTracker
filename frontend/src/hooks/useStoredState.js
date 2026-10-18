import { useEffect, useState } from 'react';

/**
 * useState that remembers a per-viewer UI preference (view mode, sort) in
 * localStorage. Falls back to `initial` whenever storage is unavailable or
 * holds a value outside `allowed`.
 */
export function useStoredState(key, initial, allowed) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null && (!allowed || allowed.includes(stored)) ? stored : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
  }, [key, value]);

  return [value, setValue];
}
