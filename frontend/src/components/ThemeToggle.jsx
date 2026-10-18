import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { IconSun, IconMoon } from './Icons';

export default function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      {isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
      <span className="theme-toggle__label">{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
}
