import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

// ── animation variants ────────────────────────────────────────────────────
const shakeVariants = {
  idle:  { x: 0 },
  shake: {
    x: [0, -9, 9, -6, 6, -3, 3, 0],
    transition: { duration: 0.38, ease: 'easeInOut' },
  },
};

const fieldVariants = {
  hidden:  { opacity: 0, y: -6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit:    { opacity: 0, y: 5, transition: { duration: 0.13 } },
};

// ── EyeIcon ───────────────────────────────────────────────────────────────
function EyeIcon({ visible }) {
  return visible ? (
    // eye-off: password hidden → show plain text
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    // eye: password visible → hide
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ── PasswordField ─────────────────────────────────────────────────────────
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
        aria-describedby={hasError ? `${id}-error` : undefined}
      />
      <button
        type="button"
        className="login-card__pw-toggle"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        tabIndex={0}
      >
        <EyeIcon visible={show} />
      </button>
    </div>
  );
}

// ── Login page ────────────────────────────────────────────────────────────
export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode]         = useState('login');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState(null);
  const [shaking, setShaking]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── handlers (untouched logic) ──────────────────────────────────────────
  function switchMode(next) {
    setMode(next); setError(null);
    setName(''); setEmail(''); setPassword(''); setConfirm('');
  }

  function triggerShake() {
    setShaking(true);
    setTimeout(() => setShaking(false), 420);
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
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      triggerShake();
    } finally {
      setSubmitting(false);
    }
  }

  // ── render ──────────────────────────────────────────────────────────────
  return (
    <div className="login-page">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
      >
        {/* ── brand ── */}
        <div className="login-card__brand">
          <div className="login-card__logo-mark" aria-hidden="true">🎥</div>
          <span className="login-card__logo-name">Cine<span>Tracker</span></span>
          <span className="login-card__tagline">Your personal movie &amp; series journal</span>
        </div>

        {/* ── heading — animates on mode switch ── */}
        <AnimatePresence mode="wait">
          <motion.h1
            key={mode + '-heading'}
            className="login-card__heading"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.18 } }}
            exit={{ opacity: 0, y: 3, transition: { duration: 0.1 } }}
          >
            {mode === 'login' ? 'Sign in' : 'Create your account'}
          </motion.h1>
        </AnimatePresence>

        {/* ── error banner ── */}
        <AnimatePresence>
          {error && (
            <motion.p
              className="form-error"
              role="alert"
              aria-live="assertive"
              initial={{ opacity: 0, scaleY: 0.9, transformOrigin: 'top' }}
              animate={{ opacity: 1, scaleY: 1, transition: { duration: 0.2 } }}
              exit={{ opacity: 0, scaleY: 0.9, transition: { duration: 0.13 } }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* ── form — shakes on auth failure ── */}
        <motion.form
          onSubmit={handleSubmit}
          noValidate
          variants={shakeVariants}
          animate={shaking ? 'shake' : 'idle'}
        >
          {/* name — register only */}
          <AnimatePresence>
            {mode === 'register' && (
              <motion.div
                className="form-group"
                key="name-field"
                variants={fieldVariants}
                initial="hidden" animate="visible" exit="exit"
              >
                <label htmlFor="auth-name">Name</label>
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  autoComplete="name"
                  placeholder="Your name"
                  className={error && !name.trim() ? 'input--error' : ''}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* email */}
          <div className="form-group">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus={mode === 'login'}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          {/* password */}
          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <PasswordField
              id="auth-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder={mode === 'register' ? 'At least 6 characters' : ''}
              hasError={false}
            />
          </div>

          {/* confirm password — register only */}
          <AnimatePresence>
            {mode === 'register' && (
              <motion.div
                className="form-group"
                key="confirm-field"
                variants={fieldVariants}
                initial="hidden" animate="visible" exit="exit"
              >
                <label htmlFor="auth-confirm">Confirm password</label>
                <PasswordField
                  id="auth-confirm"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  hasError={!!(error && error.includes('match'))}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* submit */}
          <motion.button
            type="submit"
            className={`btn btn--primary login-card__submit${submitting ? ' login-card__submit--loading' : ''}`}
            disabled={submitting}
            whileTap={{ scale: 0.97 }}
          >
            {submitting ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Please wait…
              </>
            ) : mode === 'login' ? 'Log in' : 'Create account'}
          </motion.button>
        </motion.form>

        {/* ── mode-switch footer ── */}
        <p className="login-card__switch">
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button className="login-card__switch-btn" onClick={() => switchMode('register')}>
                Register for free
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button className="login-card__switch-btn" onClick={() => switchMode('login')}>
                Log in
              </button>
            </>
          )}
        </p>
      </motion.div>
    </div>
  );
}
