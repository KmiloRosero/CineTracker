import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const shakeVariants = {
  idle:  { x: 0 },
  shake: { x: [0, -8, 8, -6, 6, -3, 3, 0], transition: { duration: 0.38 } },
};

const fieldVariants = {
  hidden:  { opacity: 0, y: -5 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit:    { opacity: 0, y: 4,  transition: { duration: 0.12 } },
};

function IconClose() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}

function PasswordField({ id, value, onChange, autoComplete, placeholder, hasError }) {
  const [show, setShow] = useState(false);
  return (
    <div className="login-card__pw-wrap">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={hasError ? 'input--error' : ''}
      />
      <button
        type="button"
        className="login-card__pw-toggle"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {show
          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        }
      </button>
    </div>
  );
}

export default function LoginModal() {
  const { loginModalOpen, closeLoginModal, login, register, onLoginSuccess } = useAuth();

  const [mode,      setMode]      = useState('login');
  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [error,     setError]     = useState(null);
  const [shaking,   setShaking]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const overlayRef = useRef(null);

  // Reset form when modal opens
  useEffect(() => {
    if (loginModalOpen) {
      setMode('login');
      setName(''); setEmail(''); setPassword(''); setConfirm('');
      setError(null); setShaking(false);
    }
  }, [loginModalOpen]);

  function switchMode(next) {
    setMode(next); setError(null);
    setName(''); setEmail(''); setPassword(''); setConfirm('');
  }

  function triggerShake() {
    setShaking(true);
    setTimeout(() => setShaking(false), 420);
  }

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) closeLoginModal();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (mode === 'register' && password !== confirm) {
      setError('Passwords do not match.');
      triggerShake(); return;
    }
    setSubmitting(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(name, email, password);
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
      triggerShake();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {loginModalOpen && (
        <motion.div
          ref={overlayRef}
          className="modal-overlay login-modal-overlay"
          onClick={handleOverlayClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.18 } }}
          exit={{ opacity: 0, transition: { duration: 0.14 } }}
          aria-modal="true"
          role="dialog"
          aria-label="Sign in to continue"
        >
          <motion.div
            className="modal login-modal"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: [0.22,1,0.36,1] } }}
            exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.15 } }}
          >
            {/* header */}
            <div className="modal__header">
              <div className="login-modal__brand">
                <span className="login-modal__logo">🎥</span>
                <div>
                  <h2 className="login-modal__title">
                    {mode === 'login' ? 'Sign in to continue' : 'Create an account'}
                  </h2>
                  <p className="login-modal__sub">
                    {mode === 'login'
                      ? 'Log in to save titles, rate, and track your watches.'
                      : 'Free account — your data stays on your device.'}
                  </p>
                </div>
              </div>
              <button className="modal__close" onClick={closeLoginModal} aria-label="Close">
                <IconClose />
              </button>
            </div>

            {/* error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  className="form-error"
                  role="alert"
                  initial={{ opacity: 0, scaleY: 0.9, transformOrigin: 'top' }}
                  animate={{ opacity: 1, scaleY: 1, transition: { duration: 0.18 } }}
                  exit={{ opacity: 0, scaleY: 0.9, transition: { duration: 0.12 } }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }} aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* form */}
            <motion.form
              onSubmit={handleSubmit}
              noValidate
              variants={shakeVariants}
              animate={shaking ? 'shake' : 'idle'}
            >
              <AnimatePresence>
                {mode === 'register' && (
                  <motion.div className="form-group" key="name-f" variants={fieldVariants} initial="hidden" animate="visible" exit="exit">
                    <label htmlFor="lm-name">Name</label>
                    <input id="lm-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                      required autoFocus autoComplete="name" placeholder="Your name" />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="form-group">
                <label htmlFor="lm-email">Email</label>
                <input id="lm-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  required autoFocus={mode === 'login'} autoComplete="email" placeholder="you@example.com" />
              </div>

              <div className="form-group">
                <label htmlFor="lm-password">Password</label>
                <PasswordField
                  id="lm-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'register' ? 'At least 6 characters' : ''}
                  hasError={false}
                />
              </div>

              <AnimatePresence>
                {mode === 'register' && (
                  <motion.div className="form-group" key="confirm-f" variants={fieldVariants} initial="hidden" animate="visible" exit="exit">
                    <label htmlFor="lm-confirm">Confirm password</label>
                    <PasswordField
                      id="lm-confirm"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      hasError={!!(error && error.includes('match'))}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                className="btn btn--primary btn--full"
                style={{ marginTop: 8, padding: '10px', fontSize: '.9rem', justifyContent: 'center' }}
                disabled={submitting}
                whileTap={{ scale: 0.97 }}
              >
                {submitting
                  ? <><IconSpinner /> Please wait…</>
                  : mode === 'login' ? 'Log in' : 'Create account'}
              </motion.button>
            </motion.form>

            {/* mode switch */}
            <p className="login-card__switch" style={{ marginTop: 16 }}>
              {mode === 'login' ? (
                <>Don&apos;t have an account?{' '}
                  <button className="login-card__switch-btn" onClick={() => switchMode('register')}>
                    Register for free
                  </button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button className="login-card__switch-btn" onClick={() => switchMode('login')}>
                    Log in
                  </button>
                </>
              )}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
