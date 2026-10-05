import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Returns a `requireAuth(fn)` wrapper.
 *
 * - If the user is already logged in, `fn` is called immediately.
 * - If not, the login modal opens; `fn` is stored and automatically
 *   called after a successful login.
 *
 * Usage:
 *   const requireAuth = useRequireAuth();
 *   <button onClick={() => requireAuth(() => doSomething())}>Save</button>
 */
export function useRequireAuth() {
  const { user, openLoginModal } = useAuth();

  const requireAuth = useCallback((fn) => {
    if (user) {
      fn();
    } else {
      openLoginModal(fn);
    }
  }, [user, openLoginModal]);

  return requireAuth;
}
