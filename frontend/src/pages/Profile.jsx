import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import GuestPrompt from '../components/GuestPrompt';
import { ConfirmDialog } from '../components/Modal';
import { IconUpload, IconSpinner, IconSun, IconMoon, IconTrash } from '../components/Icons';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { avatarFromFile } from '../utils/avatar';

const MIN_PASSWORD = 6;

function unwrap(result) {
  if (result?.error) throw new Error(result.error);
  return result;
}

const sectionVariants = {
  hidden:  { opacity: 0, y: 10 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 } }),
};

function Section({ index, title, description, children, danger = false }) {
  return (
    <motion.section className={`settings-section${danger ? ' settings-section--danger' : ''}`} variants={sectionVariants} custom={index} aria-label={title}>
      <div className="settings-section__intro">
        <h2 className="settings-section__title">{title}</h2>
        {description && <p>{description}</p>}
      </div>
      <div className="settings-section__body">{children}</div>
    </motion.section>
  );
}

function Field({ id, label, error, hint, children }) {
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <p id={`${id}-error`} className="field-error" role="alert">{error}</p>
        : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

// ── Profile: name and avatar ──────────────────────────────────────────────
function ProfileForm({ user, onSaved }) {
  const showToast = useToast();
  const fileRef = useRef(null);
  const [name,   setName]   = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatar_url);
  const [error,  setError]  = useState(null);
  const [saving, setSaving] = useState(false);

  const dirty = name.trim() !== user.name || avatar !== user.avatar_url;

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setAvatar(await avatarFromFile(file));
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function save(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const updated = unwrap(await window.electronAPI.updateProfile({ name, avatarUrl: avatar ?? null }));
      onSaved(updated);
      showToast({ message: 'Profile saved.' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} noValidate>
      <div className="avatar-field">
        <div className="avatar-field__preview" aria-hidden="true">
          {avatar ? <img src={avatar} alt="" /> : <span>{(name.trim() || user.name).charAt(0).toUpperCase()}</span>}
        </div>
        <div className="avatar-field__actions">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" id="avatar-file" onChange={pick} />
          <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
            <IconUpload size={16} /> {avatar ? 'Change photo' : 'Upload photo'}
          </button>
          {avatar && <button type="button" className="btn btn--ghost" onClick={() => setAvatar(null)}>Remove</button>}
          <p className="field-hint">PNG, JPEG or WebP. It is cropped to a square.</p>
        </div>
      </div>

      <Field id="profile-name" label="Name" error={error}>
        <input id="profile-name" value={name} maxLength={60} onChange={(e) => { setName(e.target.value); setError(null); }} aria-invalid={Boolean(error)} aria-describedby={error ? 'profile-name-error' : undefined} />
      </Field>
      <p className="settings-readonly"><span className="form-group__label">Email</span> {user.email}</p>

      <div className="form-actions form-actions--start">
        <button type="submit" className="btn btn--primary" disabled={!dirty || saving}>
          {saving && <IconSpinner />} Save profile
        </button>
      </div>
    </form>
  );
}

// ── Password ──────────────────────────────────────────────────────────────
function PasswordForm() {
  const showToast = useToast();
  const [current, setCurrent] = useState('');
  const [next,    setNext]    = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);

  function validate() {
    const e = {};
    if (!current) e.current = 'Enter your current password.';
    if (next.length < MIN_PASSWORD) e.next = `Use at least ${MIN_PASSWORD} characters.`;
    else if (next === current) e.next = 'Choose a password different from the current one.';
    if (confirm !== next) e.confirm = 'The passwords do not match.';
    return e;
  }

  async function save(ev) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      unwrap(await window.electronAPI.changePassword(current, next));
      setCurrent(''); setNext(''); setConfirm('');
      showToast({ message: 'Password changed.' });
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setSaving(false);
    }
  }

  const clear = (key) => setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));

  return (
    <form onSubmit={save} noValidate>
      {errors.form && <p className="form-error" role="alert">{errors.form}</p>}
      <Field id="pw-current" label="Current password" error={errors.current}>
        <input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => { setCurrent(e.target.value); clear('current'); }} aria-invalid={Boolean(errors.current)} />
      </Field>
      <div className="form-row">
        <Field id="pw-new" label="New password" error={errors.next} hint={`At least ${MIN_PASSWORD} characters.`}>
          <input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => { setNext(e.target.value); clear('next'); }} aria-invalid={Boolean(errors.next)} />
        </Field>
        <Field id="pw-confirm" label="Repeat new password" error={errors.confirm}>
          <input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => { setConfirm(e.target.value); clear('confirm'); }} aria-invalid={Boolean(errors.confirm)} />
        </Field>
      </div>
      <div className="form-actions form-actions--start">
        <button type="submit" className="btn btn--primary" disabled={saving}>{saving && <IconSpinner />} Change password</button>
      </div>
    </form>
  );
}

// ── Profile page ──────────────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate();
  const showToast = useToast();
  const { user, updateUser, forgetUser } = useAuth();
  const [theme, setTheme] = useTheme();
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  if (!user) {
    return (
      <main className="page">
        <h1 className="page__heading">Profile</h1>
        <GuestPrompt title="Your account lives here" message="Log in to edit your name and photo, change your password or manage your data." />
      </main>
    );
  }

  async function deleteAccount() {
    if (!deletePassword) throw new Error('Enter your password to confirm.');
    unwrap(await window.electronAPI.deleteAccount(deletePassword));
    forgetUser();
    showToast({ message: 'Your account and its data were deleted.' });
    navigate('/', { replace: true });
  }

  return (
    <main className="page profile">
      <header className="page__header">
        <h1 className="page__heading">Profile &amp; settings</h1>
      </header>

      <motion.div className="settings" initial="hidden" animate="visible">
        <Section index={0} title="Profile" description="How you appear in the sidebar. Only you can see it.">
          <ProfileForm user={user} onSaved={updateUser} />
        </Section>

        <Section index={1} title="Appearance" description="Dark suits evening viewing; light suits a bright room.">
          <div className="segmented segmented--page" role="radiogroup" aria-label="Theme">
            {[['dark', 'Dark', IconMoon], ['light', 'Light', IconSun]].map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                className={`segmented__option${theme === value ? ' is-active' : ''}`}
                onClick={() => setTheme(value)}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
        </Section>

        <Section index={2} title="Password" description="You need your current password to set a new one.">
          <PasswordForm />
        </Section>

        <Section index={3} title="About" description="CineTracker keeps your catalogue on this computer.">
          <p className="settings-about">
            Movie and series information and images come from TMDB.
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        </Section>

        <Section index={4} danger title="Delete account" description="Deletes your account with every title, watch and list in it. This cannot be undone.">
          <button className="btn btn--danger" onClick={() => { setDeletePassword(''); setDeleting(true); }}>
            <IconTrash size={16} /> Delete my account
          </button>
        </Section>
      </motion.div>

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={deleteAccount}
        title="Delete account"
        message="Type your password to permanently delete your account and all of its data."
        confirmLabel="Delete account"
      >
        <div className="form-group">
          <label htmlFor="delete-password">Password</label>
          <input id="delete-password" type="password" autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} data-autofocus />
        </div>
      </ConfirmDialog>
    </main>
  );
}
