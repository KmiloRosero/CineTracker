import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconCheck, IconClose, IconAlert } from './Icons';

const ToastContext = createContext(null);

/** App-wide toasts: `const showToast = useToast(); showToast({ message, type, action? })`; `action` = { label, onClick } (e.g. Deshacer). */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const showToast = useCallback(({ message, type = 'success', duration, action = null }) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type, action }]);
    duration = duration ?? (action ? 6000 : 3500); // time to reach the action
    setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="false">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={`toast toast--${t.type}`}
              role={t.type === 'error' ? 'alert' : 'status'}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } }}
              exit={{ opacity: 0, x: 16, transition: { duration: 0.15 } }}
            >
              <span className="toast__icon">{t.type === 'error' ? <IconAlert size={16} /> : <IconCheck size={16} />}</span>
              <span className="toast__message">{t.message}</span>
              {t.action && (
                <button className="toast__action" onClick={() => { t.action.onClick(); dismiss(t.id); }}>
                  {t.action.label}
                </button>
              )}
              <button className="toast__dismiss" onClick={() => dismiss(t.id)} aria-label="Cerrar notificación">
                <IconClose size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
