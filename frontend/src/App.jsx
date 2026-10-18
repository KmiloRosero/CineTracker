import React from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import TitleDetail from './pages/TitleDetail';
import Statistics from './pages/Statistics';
import Lists from './pages/Lists';
import ListDetail from './pages/ListDetail';
import Profile from './pages/Profile';
import Login from './pages/Login';
import ThemeToggle from './components/ThemeToggle';
import LoginModal from './components/LoginModal';
import Wordmark from './components/Wordmark';
import { ToastProvider } from './components/Toast';
import { PageLoading } from './components/PageLoading';
import { IconHome, IconFilm, IconChart, IconList, IconLogIn } from './components/Icons';
import { useAuth } from './context/AuthContext';

const NAV_LINKS = [
  { to: '/',           label: 'Home',       Icon: IconHome  },
  { to: '/catalog',    label: 'Catalog',    Icon: IconFilm  },
  { to: '/lists',      label: 'Lists',      Icon: IconList  },
  { to: '/statistics', label: 'Statistics', Icon: IconChart },
];

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.13, ease: 'easeIn' } },
};

export function PageWrapper({ children }) {
  return (
    <motion.div className="page-wrapper" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  );
}

function Sidebar() {
  const { user, logout, openLoginModal } = useAuth();

  return (
    <nav className="app-sidebar" aria-label="Main navigation">
      <div className="app-sidebar__logo">
        <Wordmark />
      </div>

      {NAV_LINKS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `sidebar-nav__link${isActive ? ' active' : ''}`}
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
              <span className="nav-icon"><Icon size={16} /></span>
              <span className="sidebar-nav__label">{label}</span>
            </>
          )}
        </NavLink>
      ))}

      <div className="app-sidebar__spacer" />
      <ThemeToggle />

      {user ? (
        <div className="sidebar-user">
          <NavLink to="/profile" className="sidebar-user__link" aria-label={`${user.name}: profile and settings`}>
            {user.avatar_url
              ? <img className="sidebar-user__avatar" src={user.avatar_url} alt="" />
              : <span className="sidebar-user__initials" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>}
            <span className="sidebar-user__info">
              <span className="sidebar-user__name">{user.name}</span>
              <span className="sidebar-user__hint">Profile &amp; settings</span>
            </span>
          </NavLink>
          <button className="sidebar-user__logout" onClick={logout}>Log out</button>
        </div>
      ) : (
        <button className="sidebar-login-btn" onClick={() => openLoginModal()}>
          <IconLogIn size={16} />
          <span>Log in</span>
        </button>
      )}
    </nav>
  );
}

export default function App() {
  const { loading } = useAuth();
  const location = useLocation();
  // Moving between titles keeps the showcase mounted so it can animate the swap itself.
  const isShowcase = location.pathname.startsWith('/title/') && location.pathname !== '/title/new';
  const routeKey = isShowcase ? '/title' : location.pathname;

  if (loading) return <PageLoading message="Starting CineTracker…" />;

  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <div className="app-layout">
          <Sidebar />

          <div className="app-content">
            <AnimatePresence mode="wait">
              <Routes location={location} key={routeKey}>
                <Route path="/login"      element={<PageWrapper><Login /></PageWrapper>} />
                <Route path="/"           element={<PageWrapper><Home /></PageWrapper>} />
                <Route path="/catalog"    element={<PageWrapper><Catalog /></PageWrapper>} />
                <Route path="/title/:id"  element={<PageWrapper><TitleDetail /></PageWrapper>} />
                <Route path="/lists"      element={<PageWrapper><Lists /></PageWrapper>} />
                <Route path="/lists/:id"  element={<PageWrapper><ListDetail /></PageWrapper>} />
                <Route path="/statistics" element={<PageWrapper><Statistics /></PageWrapper>} />
                <Route path="/profile"    element={<PageWrapper><Profile /></PageWrapper>} />
                <Route path="*"           element={<Navigate to="/" replace />} />
              </Routes>
            </AnimatePresence>
          </div>

          {/* rendered at root so it overlays any page */}
          <LoginModal />
        </div>
      </ToastProvider>
    </MotionConfig>
  );
}
