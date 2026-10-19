import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LoginForm } from '@/components/ui/login-form';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

function validate(mode, { name, email, password, confirm }) {
  const e = {};
  if (mode === 'register' && !name.trim()) e.name = 'Escribe tu nombre.';
  if (!email.trim()) e.email = 'Escribe tu correo.';
  else if (!EMAIL_RE.test(email.trim())) e.email = 'Escribe un correo válido, como tu@ejemplo.com.';
  if (!password) e.password = 'Escribe tu contraseña.';
  else if (mode === 'register' && password.length < MIN_PASSWORD) e.password = `Usa al menos ${MIN_PASSWORD} caracteres.`;
  if (mode === 'register' && confirm !== password) e.confirm = 'Las contraseñas no coinciden.';
  return e;
}

/**
 * Login / register logic shared by the Login page and the login modal:
 * validation on blur and submit, real backend errors, loading state, the
 * "keep me signed in" choice. The glass card itself is ui/login-form.
 */
export default function AuthForm({ onSuccess, onClose, headingLevel = 'h1', idPrefix = 'auth', brand }) {
  const { login, register } = useAuth();
  const [mode, setMode]         = useState('login');
  const [values, setValues]     = useState({ name: '', email: '', password: '', confirm: '' });
  const [touched, setTouched]   = useState({});
  const [errors, setErrors]     = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy]         = useState(false);
  const [remember, setRemember] = useState(true);
  const [shakeKey, setShakeKey] = useState(0);

  function change(field, value) {
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

  async function submit() {
    const found = validate(mode, values);
    setErrors(found);
    setTouched({ name: true, email: true, password: true, confirm: true });
    if (Object.keys(found).length) { setShakeKey((k) => k + 1); return; }

    setBusy(true);
    setFormError(null);
    try {
      if (mode === 'login') await login(values.email.trim(), values.password, remember);
      else await register(values.name, values.email.trim(), values.password, remember);
      onSuccess?.();
    } catch (err) {
      setFormError(err.message);
      setShakeKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  const shown = Object.fromEntries(Object.entries(errors).filter(([field]) => touched[field]));

  return (
    <LoginForm
      mode={mode}
      values={values}
      errors={shown}
      formError={formError}
      busy={busy}
      remember={remember}
      shakeKey={shakeKey}
      idPrefix={idPrefix}
      headingLevel={headingLevel}
      brand={brand}
      onChange={change}
      onBlur={blur}
      onRememberChange={setRemember}
      onSubmit={submit}
      onModeChange={switchMode}
      onClose={onClose}
    />
  );
}
