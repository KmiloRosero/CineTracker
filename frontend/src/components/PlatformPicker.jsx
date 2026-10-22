import React, { useEffect, useState } from 'react';
import { IconCheck, IconSpinner } from './Icons';
import { useToast } from './Toast';
import { tmdbImage } from '../utils/tmdbImage';
import { unwrap } from '../utils/ai';

/**
 * "Mis plataformas": the streaming services in Colombia as logo tiles; a
 * click adds or removes one and saves right away. `onChange` receives the
 * saved list.
 */
export default function PlatformPicker({ onChange }) {
  const showToast = useToast();
  const [catalog, setCatalog] = useState(null);
  const [mine,    setMine]    = useState([]);
  const [error,   setError]   = useState(null);
  const [saving,  setSaving]  = useState(null); // provider id being saved

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      window.electronAPI.getPlatformCatalog().then(unwrap),
      window.electronAPI.getMyPlatforms().then(unwrap),
    ])
      .then(([all, saved]) => {
        if (cancelled) return;
        // saved services TMDB no longer lists stay visible so they can be removed
        const ids = new Set(all.map((p) => p.id));
        setCatalog([...all, ...saved.filter((p) => !ids.has(p.id))]);
        setMine(saved);
      })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  async function toggle(p) {
    const on = mine.some((m) => m.id === p.id);
    const next = on ? mine.filter((m) => m.id !== p.id) : [...mine, p];
    setSaving(p.id);
    try {
      const saved = unwrap(await window.electronAPI.setMyPlatforms(next));
      setMine(saved);
      onChange?.(saved);
    } catch (err) {
      showToast({ message: `No se pudo guardar: ${err.message}`, type: 'error' });
    } finally {
      setSaving(null);
    }
  }

  if (error) return <p className="form-error" role="alert">No se pudieron cargar las plataformas: {error}</p>;
  if (!catalog) return <p className="field-hint" role="status">Cargando plataformas…</p>;

  return (
    <div className="platforms">
      <p className="field-hint platforms__count" role="status">
        {mine.length === 0 ? 'Aún no elegiste ninguna.' : `${mine.length} ${mine.length === 1 ? 'plataforma elegida' : 'plataformas elegidas'}: ${mine.map((m) => m.name).join(', ')}.`}
      </p>
      <ul className="platforms__grid">
        {catalog.map((p) => {
          const on = mine.some((m) => m.id === p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                className={`platform${on ? ' is-on' : ''}`}
                aria-pressed={on}
                onClick={() => toggle(p)}
                disabled={saving !== null}
              >
                {p.logo_path
                  ? <img src={tmdbImage(p.logo_path, 'w92')} alt="" className="platform__logo" loading="lazy" />
                  : <span className="platform__logo platform__logo--empty" aria-hidden="true">{p.name.charAt(0)}</span>}
                <span className="platform__name">{p.name}</span>
                <span className="platform__mark" aria-hidden="true">
                  {saving === p.id ? <IconSpinner size={14} /> : on ? <IconCheck size={14} /> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
