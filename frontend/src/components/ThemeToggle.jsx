import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { IconSun, IconMoon } from './Icons';

/** Light/dark switch; `compact` shows only the icon (collapsed sidebar). */
export default function ThemeToggle({ compact = false }) {
  const [theme, setTheme] = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Modo claro' : 'Modo oscuro';

  return (
    <button
      className={`theme-toggle${compact ? ' theme-toggle--compact' : ''}`}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={`Cambiar al tema ${isDark ? 'claro' : 'oscuro'}`}
      data-tip={compact ? label : undefined}
    >
      {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
      {!compact && <span className="theme-toggle__label">{label}</span>}
    </button>
  );
}
