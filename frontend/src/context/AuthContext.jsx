import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(undefined); // undefined = loading
  const [loading, setLoading] = useState(true);

  // Login modal state
  const [loginModalOpen,  setLoginModalOpen]  = useState(false);
  const [pendingAction,   setPendingAction]   = useState(null); // () => void

  useEffect(() => {
    window.electronAPI.getCurrentUser()
      .then((u) => setUser(u ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const result = await window.electronAPI.login(email, password);
    if (result?.error) throw new Error(result.error);
    setUser(result);
    return result;
  }

  async function register(name, email, password) {
    const result = await window.electronAPI.register(name, email, password);
    if (result?.error) throw new Error(result.error);
    setUser(result);
    return result;
  }

  async function logout() {
    await window.electronAPI.logout();
    setUser(null);
  }

  /**
   * Opens the login modal. If `onSuccess` is provided, it will be called
   * after a successful login so the user's original action completes.
   */
  const openLoginModal = useCallback((onSuccess = null) => {
    setPendingAction(() => onSuccess); // store as function to avoid setState(fn) ambiguity
    setLoginModalOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setLoginModalOpen(false);
    setPendingAction(null);
  }, []);

  /** Called by LoginModal after a successful login/register. */
  const onLoginSuccess = useCallback(() => {
    setLoginModalOpen(false);
    if (pendingAction) {
      // run on next tick so state has flushed
      setTimeout(() => {
        pendingAction();
        setPendingAction(null);
      }, 0);
    }
  }, [pendingAction]);

  return (
    <AuthContext.Provider value={{
      user, loading,
      login, register, logout,
      loginModalOpen, openLoginModal, closeLoginModal, onLoginSuccess,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
