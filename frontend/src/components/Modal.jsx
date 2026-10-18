import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconClose, IconSpinner } from './Icons';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog: Escape and the backdrop close it, Tab stays inside,
 * the first field gets focus, and focus returns to the trigger on close.
 */
export default function Modal({ open, onClose, title, label, wide = false, className = '', children }) {
  const panelRef = useRef(null);
  const returnRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    returnRef.current = document.activeElement;
    const panel = panelRef.current;
    // React's autoFocus focuses without leaving an attribute, so dialogs mark their
    // preferred first control with data-autofocus (e.g. Cancel on destructive ones).
    const first = panel?.querySelector('[data-autofocus], [autofocus]') ?? panel?.querySelector(FOCUSABLE);
    first?.focus();

    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll(FOCUSABLE)];
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) { e.preventDefault(); lastItem.focus(); }
      else if (!e.shiftKey && document.activeElement === lastItem) { e.preventDefault(); firstItem.focus(); }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      returnRef.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.16 } }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
        >
          <motion.div
            ref={panelRef}
            className={`modal${wide ? ' modal--wide' : ''}${className ? ` ${className}` : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={label ?? title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] } }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.14 } }}
          >
            {title && (
              <div className="modal__header">
                <h2 className="modal__title">{title}</h2>
                <button className="modal__close" onClick={onClose} aria-label="Close"><IconClose size={16} /></button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Confirmation for destructive actions. `onConfirm` may be async; its error
 * message is shown in the dialog instead of closing it.
 */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', children }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { if (open) { setBusy(false); setError(null); } }, [open]);

  async function confirm(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={title}>
      <form className="confirm" onSubmit={confirm}>
        {message && <p className="confirm__message">{message}</p>}
        {children}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy} data-autofocus>Cancel</button>
          <button type="submit" className="btn btn--danger" disabled={busy}>
            {busy && <IconSpinner />}
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
