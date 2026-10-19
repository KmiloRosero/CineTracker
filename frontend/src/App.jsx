import React, { useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import TitleDetail from './pages/TitleDetail';
import Statistics from './pages/Statistics';
import Lists from './pages/Lists';
import ListDetail from './pages/ListDetail';
import Profile from './pages/Profile';
import Login from './pages/Login';
import LoginModal from './components/LoginModal';
import Sidebar from './components/Sidebar';
import { ToastProvider } from './components/Toast';
import { PageLoading } from './components/PageLoading';
import { useStoredState } from './hooks/useStoredState';
import { useAuth } from './context/AuthContext';


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

export default function App() {
  const { loading } = useAuth();
  const location = useLocation();
  const [sidebar, setSidebar] = useStoredState('cinetracker-sidebar', 'expanded', ['expanded', 'collapsed']);
  const toggleSidebar = useCallback(() => setSidebar((s) => (s === 'collapsed' ? 'expanded' : 'collapsed')), [setSidebar]);
  // Moving between titles keeps the showcase mounted so it can animate the swap itself.
  const isShowcase = location.pathname.startsWith('/title/') && location.pathname !== '/title/new';
  const routeKey = isShowcase ? '/title' : location.pathname;

  if (loading) return <PageLoading message="Iniciando CineTracker…" />;

  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <div className="app-layout" data-sidebar={sidebar}>
          <Sidebar collapsed={sidebar === 'collapsed'} onToggle={toggleSidebar} />

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
