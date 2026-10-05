import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(undefined); // undefined = still loading
  const [loading, setLoading] = useState(true);

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

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
