import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { IconSpinner } from './Icons';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

const COPY = {
  login:    { title: 'Log in',            sub: 'Pick up where you left off.',                     submit: 'Log in',         busy: 'Logging in…' },
  register: { title: 'Create an account', sub: 'Free, and your data stays on this computer.',     submit: 'Create account', busy: 'Creating account…' },
};

function validate(mode, { name, email, password, confirm }) {
  const e = {};
  if (mode === 'register' && !name.trim()) e.name = 'Enter your name.';
  if (!email.trim()) e.email = 'Enter your email.';
  else if (!EMAIL_RE.test(email.trim())) e.email = 'Enter a valid email, like you@example.com.';
  if (!password) e.password = 'Enter your password.';
  else if (mode === 'register' && password.length < MIN_PASSWORD) e.password = `Use at least ${MIN_PASSWORD} characters.`;
  if (mode === 'register' && confirm !== password) e.confirm = 'The passwords do not match.';
  return e;
}

function EyeIcon({ open }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true">
      {open
        ? <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>
        : <><path d="M10.6 5.1A10 10 0 0112 5c6 0 10 7 10 7a17 17 0 01-2.6 3.3M6.1 6.1C3.6 7.8 2 12 2 12s4 7 10 7a9.6 9.6 0 004.2-.9"/><line x1="3" y1="3" x2="21" y2="21"/></>}
    </svg>
  );
}

// the broadcast wipe: green slab leads, black slab follows
const wipe = (delay) => ({
  hidden:  { scaleX: 0 },
  visible: { scaleX: 1, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1], delay } },
  exit:    { opacity: 0, transition: { duration: 0.12 } },
});

function Field({ id, label, error, children }) {
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <p id={`${id}-error`} className="field-error" role="alert">{error}</p>}
    </div>
  );
}

/**
 * Login / register form shared by the Login page and the login modal:
 * inline validation on blur and submit, real backend errors, loading state
 * and a short shake on failure.
 */
export default function AuthForm({ onSuccess, headingLevel = 'h1', idPrefix = 'auth' }) {
  const { login, register } = useAuth();
  const reduceMotion = useReducedMotion();
  const [mode, setMode]       = useState('login');
  const [values, setValues]   = useState({ name: '', email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState({});
  const [errors, setErrors]   = useState({});
  const [formError, setFormError] = useState(null);
  const [showPw, setShowPw]   = useState(false);
  const [busy, setBusy]       = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const copy = COPY[mode];
  const Heading = headingLevel;
  const id = (field) => `${idPrefix}-${field}`;

  function update(field, value) {
    const next = { ...values, [field]: value };
    setValues(next);
    setFormError(null);
    if (touched[field] || errors[field]) setErrors(validate(mode, next));
  }

  function blur(field) {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validate(mode, values));
  }

  function switchMode(next) {
    setMode(next);
    setErrors({});
    setTouched({});
    setFormError(null);
    setValues((v) => ({ ...v, password: '', confirm: '' }));
  }

  async function submit(e) {
    e.preventDefault();
    const found = validate(mode, values);
    setErrors(found);
    setTouched({ name: true, email: true, password: true, confirm: true });
    if (Object.keys(found).length) { setShakeKey((k) => k + 1); return; }

    setBusy(true);
    setFormError(null);
    try {
      if (mode === 'login') await login(values.email.trim(), values.password);
      else await register(values.name, values.email.trim(), values.password);
      onSuccess?.();
    } catch (err) {
      setFormError(err.message);
      setShakeKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  const show = (field) => (touched[field] ? errors[field] : undefined);
  const invalid = (field) => ({ 'aria-invalid': Boolean(show(field)), 'aria-describedby': show(field) ? `${id(field)}-error` : undefined });

  return (
    <div className="auth-form">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={mode} className="lower-third auth-form__heading" initial="hidden" animate="visible" exit="exit">
          <motion.span className="lower-third__label" variants={wipe(0)}>
            <Heading className="auth-form__title">{copy.title}</Heading>
          </motion.span>
          <motion.span className="lower-third__meta" variants={wipe(0.08)}>
            <span className="auth-form__sub">{copy.sub}</span>
          </motion.span>
        </motion.div>
      </AnimatePresence>

      <motion.form
        key={shakeKey}
        onSubmit={submit}
        noValidate
        animate={shakeKey && !reduceMotion ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : undefined}
        transition={{ duration: 0.36 }}
      >
        <AnimatePresence initial={false}>
          {formError && (
            <motion.p className="form-error" role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {formError}
            </motion.p>
          )}
        </AnimatePresence>

        {mode === 'register' && (
          <Field id={id('name')} label="Name" error={show('name')}>
            <input id={id('name')} autoComplete="name" value={values.name} onChange={(e) => update('name', e.target.value)} onBlur={() => blur('name')} maxLength={60} autoFocus {...invalid('name')} />
          </Field>
        )}

        <Field id={id('email')} label="Email" error={show('email')}>
          <input id={id('email')} type="email" autoComplete="email" placeholder="you@example.com" value={values.email} onChange={(e) => update('email', e.target.value)} onBlur={() => blur('email')} autoFocus={mode === 'login'} {...invalid('email')} />
        </Field>

        <Field id={id('password')} label="Password" error={show('password')}>
          <div className="password-input">
            <input
              id={id('password')}
              type={showPw ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder={mode === 'register' ? `At least ${MIN_PASSWORD} characters` : undefined}
              value={values.password}
              onChange={(e) => update('password', e.target.value)}
              onBlur={() => blur('password')}
              {...invalid('password')}
            />
            <button type="button" className="password-input__toggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'} aria-pressed={showPw}>
              <EyeIcon open={showPw} />
            </button>
          </div>
        </Field>

        {mode === 'register' && (
          <Field id={id('confirm')} label="Repeat password" error={show('confirm')}>
            <input id={id('confirm')} type={showPw ? 'text' : 'password'} autoComplete="new-password" value={values.confirm} onChange={(e) => update('confirm', e.target.value)} onBlur={() => blur('confirm')} {...invalid('confirm')} />
          </Field>
        )}

        <button type="submit" className="btn btn--primary btn--lg btn--full" disabled={busy}>
          {busy && <IconSpinner />} {busy ? copy.busy : copy.submit}
        </button>
      </motion.form>

      <p className="auth-form__switch">
        {mode === 'login' ? 'New to CineTracker?' : 'Already have an account?'}{' '}
        <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Create an account' : 'Log in'}
        </button>
      </p>
    </div>
  );
}
