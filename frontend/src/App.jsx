import React from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import TitleDetail from './pages/TitleDetail';
import Statistics from './pages/Statistics';
import Login from './pages/Login';
import ThemeToggle from './components/ThemeToggle';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

const NAV_LINKS = [
  { to: '/',           label: 'Home',       icon: 'home'  },
  { to: '/catalog',    label: 'Catalog',    icon: 'film'  },
  { to: '/statistics', label: 'Statistics', icon: 'chart' },
];

// Minimal inline SVG icons — one consistent stroke weight, no emoji
function NavIcon({ name }) {
  const icons = {
    home: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><polyline points="9 21 9 12 15 12 15 21"/>
      </svg>
    ),
    film: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="2" y1="17" x2="7" y2="17"/>
      </svg>
    ),
    chart: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  };
  return <span className="nav-icon">{icons[name]}</span>;
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -5, transition: { duration: 0.13, ease: 'easeIn' } },
};

export function PageWrapper({ children }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ flex: 1 }}>
      {children}
    </motion.div>
  );
}

function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <nav className="app-sidebar" aria-label="Main navigation">
      <div className="app-sidebar__logo">
        <div className="app-sidebar__logo-mark" aria-hidden="true">🎥</div>
        <span>Cine<span style={{ color: 'var(--accent)' }}>Tracker</span></span>
      </div>

      {NAV_LINKS.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `sidebar-nav__link${isActive ? ' active' : ''}`}
        >
          <NavIcon name={icon} />
          {label}
        </NavLink>
      ))}

      <div className="app-sidebar__spacer" />
      <ThemeToggle />

      {user && (
        <div className="sidebar-user">
          {user.avatar_url ? (
            <img className="sidebar-user__avatar" src={user.avatar_url} alt={user.name} />
          ) : (
            <div className="sidebar-user__initials" aria-hidden="true">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="sidebar-user__info">
            <span className="sidebar-user__name">{user.name}</span>
            <button className="sidebar-user__logout" onClick={handleLogout}>Log out</button>
          </div>
        </div>
      )}
    </nav>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="app-layout">
      {user && <Sidebar />}

      <main className="app-content">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/login" element={
              user ? <Navigate to="/" replace /> : <PageWrapper><Login /></PageWrapper>
            } />
            <Route path="/" element={
              <ProtectedRoute><PageWrapper><Home /></PageWrapper></ProtectedRoute>
            } />
            <Route path="/catalog" element={
              <ProtectedRoute><PageWrapper><Catalog /></PageWrapper></ProtectedRoute>
            } />
            <Route path="/title/:id" element={
              <ProtectedRoute><PageWrapper><TitleDetail /></PageWrapper></ProtectedRoute>
            } />
            <Route path="/statistics" element={
              <ProtectedRoute><PageWrapper><Statistics /></PageWrapper></ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}
