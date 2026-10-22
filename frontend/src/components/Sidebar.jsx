import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import ThemeToggle from './ThemeToggle';
import Wordmark from './Wordmark';
import { IconHome, IconFilm, IconChart, IconList, IconCompass, IconCalendar, IconLogIn, IconLogOut, IconSidebar } from './Icons';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { to: '/',           label: 'Inicio',       Icon: IconHome  },
  { to: '/catalog',    label: 'Catálogo',     Icon: IconFilm  },
  { to: '/discover',   label: 'Descubrir',    Icon: IconCompass },
  { to: '/upcoming',   label: 'Estrenos',     Icon: IconCalendar },
  { to: '/lists',      label: 'Listas',       Icon: IconList  },
  { to: '/statistics', label: 'Estadísticas', Icon: IconChart },
];

/**
 * Main navigation. Expanded it shows the wordmark and labels; collapsed it
 * is a 76px rail of icons whose names appear as tips on hover and focus.
 * The choice is remembered and Ctrl+B toggles it.
 */
export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout, openLoginModal } = useAuth();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onToggle]);

  const toggleLabel = collapsed ? 'Expandir barra lateral' : 'Contraer barra lateral';

  return (
    <nav className={`app-sidebar${collapsed ? ' is-collapsed' : ''}`} aria-label="Navegación principal">
      <div className="app-sidebar__head">
        <NavLink to="/" end className="app-sidebar__brand" aria-label="CineTracker: ir al inicio">
          <Wordmark compact={collapsed} />
        </NavLink>
        <button
          type="button"
          className="app-sidebar__toggle"
          onClick={onToggle}
          aria-label={toggleLabel}
          aria-expanded={!collapsed}
          data-tip={`${toggleLabel} (Ctrl+B)`}
        >
          <IconSidebar size={18} />
        </button>
      </div>

      <ul className="sidebar-nav">
        {NAV_LINKS.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) => `sidebar-nav__link${isActive ? ' active' : ''}`}
              data-tip={collapsed ? label : undefined}
            >
              {({ isActive }) => (
                <>
                  {/* one green slab slides between the active links */}
                  {isActive && (
                    <motion.span
                      className="sidebar-nav__highlight"
                      layoutId="nav-highlight"
                      transition={{ type: 'spring', stiffness: 520, damping: 42 }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="nav-icon"><Icon size={20} /></span>
                  <span className="sidebar-nav__label">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="app-sidebar__spacer" />

      <div className="app-sidebar__foot">
        <ThemeToggle compact={collapsed} />

        {user ? (
          <div className="sidebar-user">
            <NavLink
              to="/profile"
              className={({ isActive }) => `sidebar-user__link${isActive ? ' active' : ''}`}
              aria-label={`${user.name}: perfil y ajustes`}
              data-tip={collapsed ? 'Perfil y ajustes' : undefined}
            >
              {user.avatar_url
                ? <img className="sidebar-user__avatar" src={user.avatar_url} alt="" />
                : <span className="sidebar-user__initials" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>}
              <span className="sidebar-user__info">
                <span className="sidebar-user__name">{user.name}</span>
                <span className="sidebar-user__hint">Perfil y ajustes</span>
              </span>
            </NavLink>
            <button type="button" className="sidebar-user__logout" onClick={logout} aria-label="Cerrar sesión" data-tip="Cerrar sesión">
              <IconLogOut size={18} />
            </button>
          </div>
        ) : (
          <button type="button" className="sidebar-login-btn" onClick={() => openLoginModal()} aria-label="Iniciar sesión" data-tip={collapsed ? 'Iniciar sesión' : undefined}>
            <IconLogIn size={18} />
            <span className="sidebar-login-btn__label">Iniciar sesión</span>
          </button>
        )}
      </div>
    </nav>
  );
}
