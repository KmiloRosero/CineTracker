import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import GuestPrompt from '../components/GuestPrompt';
import { ConfirmDialog } from '../components/Modal';
import { IconUpload, IconSpinner, IconSun, IconMoon, IconTrash, IconExternal, IconCheck, IconAlert } from '../components/Icons';
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
    if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
    setSaving(true);
    setError(null);
    try {
      const updated = unwrap(await window.electronAPI.updateProfile({ name, avatarUrl: avatar ?? null }));
      onSaved(updated);
      showToast({ message: 'Perfil guardado.' });
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
            <IconUpload size={16} /> {avatar ? 'Cambiar foto' : 'Subir foto'}
          </button>
          {avatar && <button type="button" className="btn btn--ghost" onClick={() => setAvatar(null)}>Quitar</button>}
          <p className="field-hint">PNG, JPEG o WebP. Se recorta en forma cuadrada.</p>
        </div>
      </div>

      <Field id="profile-name" label="Nombre" error={error}>
        <input id="profile-name" value={name} maxLength={60} onChange={(e) => { setName(e.target.value); setError(null); }} aria-invalid={Boolean(error)} aria-describedby={error ? 'profile-name-error' : undefined} />
      </Field>
      <p className="settings-readonly"><span className="form-group__label">Correo</span> {user.email}</p>

      <div className="form-actions form-actions--start">
        <button type="submit" className="btn btn--primary" disabled={!dirty || saving}>
          {saving && <IconSpinner />} Guardar perfil
        </button>
      </div>
    </form>
  );
}

// ── Password ──────────────────────────────────────────────────────────────
// ── API keys ──────────────────────────────────────────────────────────────
const KEY_INFO = {
  tmdb:   { label: 'TMDB',          need: 'Necesaria para buscar títulos, ver tendencias y tráilers.' },
  gemini: { label: 'Google Gemini', need: 'Opcional: recomendaciones escritas por IA.' },
};
const SOURCE_LABEL = {
  app:     'Guardada en esta app',
  file:    'Incluida en la instalación',
  process: 'Definida en el sistema',
};

function ApiKeyRow({ name, source, canSave, onChanged }) {
  const showToast = useToast();
  const [value,  setValue]  = useState('');
  const [busy,   setBusy]   = useState(null); // 'save' | 'test' | 'clear'
  const [result, setResult] = useState(null); // { ok, text }
  const info = KEY_INFO[name];
  const inputId = `apikey-${name}`;

  async function test() {
    setBusy('test');
    const r = await window.electronAPI.testApiKey(name);
    setResult(r?.error ? { ok: false, text: r.error } : { ok: true, text: 'La clave funciona.' });
    setBusy(null);
  }

  async function save(e) {
    e.preventDefault();
    if (!value.trim()) { setResult({ ok: false, text: 'Pega la clave antes de guardarla.' }); return; }
    setBusy('save');
    setResult(null);
    const r = await window.electronAPI.setApiKey(name, value);
    if (r?.error) { setResult({ ok: false, text: r.error }); setBusy(null); return; }
    setValue('');
    showToast({ message: `Clave de ${info.label} guardada.` });
    await onChanged();
    await test();
  }

  async function clear() {
    setBusy('clear');
    const r = await window.electronAPI.clearApiKey(name);
    setBusy(null);
    if (r?.error) { setResult({ ok: false, text: r.error }); return; }
    setResult(null);
    showToast({ message: `Se quitó la clave de ${info.label} guardada en la app.` });
    onChanged();
  }

  return (
    <form className="api-key" onSubmit={save} noValidate>
      <div className="api-key__head">
        <label className="api-key__name" htmlFor={inputId}>{info.label}</label>
        <span className={`api-key__status${source ? ' is-set' : ''}`}>{SOURCE_LABEL[source] ?? 'Sin configurar'}</span>
      </div>
      <p className="field-hint">{info.need}</p>
      <div className="api-key__row">
        <input
          id={inputId}
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder={source ? 'Pega una clave nueva para reemplazarla' : 'Pega tu clave aquí'}
          value={value}
          onChange={(e) => { setValue(e.target.value); setResult(null); }}
          disabled={!canSave}
          aria-describedby={result ? `${inputId}-result` : undefined}
        />
        <button type="submit" className="btn btn--primary" disabled={!canSave || busy !== null}>
          {busy === 'save' && <IconSpinner />} Guardar
        </button>
      </div>
      <div className="api-key__actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={test} disabled={!source || busy !== null}>
          {busy === 'test' && <IconSpinner />} Probar clave
        </button>
        {source === 'app' && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={clear} disabled={busy !== null}>Quitar</button>
        )}
        <button type="button" className="api-key__link" onClick={() => window.electronAPI.openKeyPage(name)}>
          Conseguir una clave <IconExternal size={14} />
        </button>
      </div>
      {result && (
        <p id={`${inputId}-result`} className={`api-key__result ${result.ok ? 'is-ok' : 'is-error'}`} role={result.ok ? 'status' : 'alert'}>
          {result.ok ? <IconCheck size={16} /> : <IconAlert size={16} />} {result.text}
        </p>
      )}
    </form>
  );
}

function ApiKeysForm({ focus = false }) {
  const [status, setStatus] = useState(null);
  const [error,  setError]  = useState(null);
  const sectionRef = useRef(null);

  async function load() {
    const r = await window.electronAPI.getApiKeys();
    if (r?.error) setError(r.error);
    else setStatus(r);
  }
  useEffect(() => { load(); }, []);

  // arriving from Home's setup screen: bring the keys into view, cursor in the first empty one
  useEffect(() => {
    if (!focus || !status) return;
    sectionRef.current?.scrollIntoView({ block: 'center' });
    const firstEmpty = Object.keys(KEY_INFO).find((name) => !status.keys[name]?.source) ?? 'tmdb';
    document.getElementById(`apikey-${firstEmpty}`)?.focus({ preventScroll: true });
  }, [focus, status !== null]);

  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (!status) return <p className="field-hint">Cargando…</p>;
  return (
    <div className="api-keys" ref={sectionRef}>
      {!status.canSave && (
        <p className="form-error" role="alert">Este equipo no permite guardar claves cifradas, así que no se pueden guardar aquí.</p>
      )}
      {Object.keys(KEY_INFO).map((name) => (
        <ApiKeyRow key={name} name={name} source={status.keys[name]?.source ?? null} canSave={status.canSave} onChanged={load} />
      ))}
    </div>
  );
}

function PasswordForm() {
  const showToast = useToast();
  const [current, setCurrent] = useState('');
  const [next,    setNext]    = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);

  function validate() {
    const e = {};
    if (!current) e.current = 'Escribe tu contraseña actual.';
    if (next.length < MIN_PASSWORD) e.next = `Usa al menos ${MIN_PASSWORD} caracteres.`;
    else if (next === current) e.next = 'Elige una contraseña distinta de la actual.';
    if (confirm !== next) e.confirm = 'Las contraseñas no coinciden.';
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
      showToast({ message: 'Contraseña cambiada.' });
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
      <Field id="pw-current" label="Contraseña actual" error={errors.current}>
        <input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => { setCurrent(e.target.value); clear('current'); }} aria-invalid={Boolean(errors.current)} />
      </Field>
      <div className="form-row">
        <Field id="pw-new" label="Nueva contraseña" error={errors.next} hint={`Al menos ${MIN_PASSWORD} caracteres.`}>
          <input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => { setNext(e.target.value); clear('next'); }} aria-invalid={Boolean(errors.next)} />
        </Field>
        <Field id="pw-confirm" label="Repite la nueva contraseña" error={errors.confirm}>
          <input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => { setConfirm(e.target.value); clear('confirm'); }} aria-invalid={Boolean(errors.confirm)} />
        </Field>
      </div>
      <div className="form-actions form-actions--start">
        <button type="submit" className="btn btn--primary" disabled={saving}>{saving && <IconSpinner />} Cambiar contraseña</button>
      </div>
    </form>
  );
}

// ── Profile page ──────────────────────────────────────────────────────────
export default function Profile() {
  const location = useLocation();
  const navigate = useNavigate();
  const showToast = useToast();
  const { user, updateUser, forgetUser } = useAuth();
  const [theme, setTheme] = useTheme();
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  if (!user) {
    return (
      <main className="page">
        <h1 className="page__heading">Perfil</h1>
        <GuestPrompt title="Aquí vive tu cuenta" message="Inicia sesión para editar tu nombre y foto, cambiar tu contraseña o gestionar tus datos." />
      </main>
    );
  }

  async function deleteAccount() {
    if (!deletePassword) throw new Error('Escribe tu contraseña para confirmar.');
    unwrap(await window.electronAPI.deleteAccount(deletePassword));
    forgetUser();
    showToast({ message: 'Se eliminaron tu cuenta y sus datos.' });
    navigate('/', { replace: true });
  }

  return (
    <main className="page profile">
      <header className="page__header">
        <h1 className="page__heading">Perfil y ajustes</h1>
      </header>

      <motion.div className="settings" initial="hidden" animate="visible">
        <Section index={0} title="Perfil" description="Cómo apareces en la barra lateral. Solo tú lo ves.">
          <ProfileForm user={user} onSaved={updateUser} />
        </Section>

        <Section index={1} title="Apariencia" description="El oscuro va bien de noche; el claro, en una habitación iluminada.">
          <div className="segmented segmented--page" role="radiogroup" aria-label="Tema">
            {[['dark', 'Oscuro', IconMoon], ['light', 'Claro', IconSun]].map(([value, label, Icon]) => (
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

        <Section index={2} title="Contraseña" description="Necesitas tu contraseña actual para poner una nueva.">
          <PasswordForm />
        </Section>

        <Section index={3} title="Claves de API" description="Tus claves se guardan cifradas con Windows en este equipo y nunca se vuelven a mostrar. Una clave guardada aquí reemplaza la incluida en la instalación.">
          <ApiKeysForm focus={location.state?.focus === 'api-keys'} />
        </Section>

        <Section index={4} title="Acerca de" description="CineTracker guarda tu catálogo en este computador.">
          <p className="settings-about">
            La información y las imágenes de películas y series provienen de TMDB.
            Este producto usa la API de TMDB, pero TMDB no lo respalda ni lo certifica.
            Las recomendaciones con IA usan Google Gemini.
          </p>
        </Section>

        <Section index={5} danger title="Eliminar cuenta" description="Elimina tu cuenta con todos sus títulos, visualizaciones y listas. No se puede deshacer.">
          <button className="btn btn--danger" onClick={() => { setDeletePassword(''); setDeleting(true); }}>
            <IconTrash size={16} /> Eliminar mi cuenta
          </button>
        </Section>
      </motion.div>

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={deleteAccount}
        title="Eliminar cuenta"
        message="Escribe tu contraseña para eliminar para siempre tu cuenta y todos sus datos."
        confirmLabel="Eliminar cuenta"
      >
        <div className="form-group">
          <label htmlFor="delete-password">Contraseña</label>
          <input id="delete-password" type="password" autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} data-autofocus />
        </div>
      </ConfirmDialog>
    </main>
  );
}
