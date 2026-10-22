import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { IconSpinner } from './Icons';
import { aiName, fallbackNote, unwrap } from '../utils/ai';

const EASE = [0.16, 1, 0.3, 1];

/** "Tu perfil de cinéfilo" on Statistics: the archetype on air, traits beside it, the blind spot below. */
export default function CinephileProfile() {
  const reduceMotion = useReducedMotion();
  const [profile, setProfile] = useState(null);
  const [busy,    setBusy]    = useState(true);
  const [error,   setError]   = useState(null);

  async function load({ refresh = false } = {}) {
    setBusy(true);
    setError(null);
    try {
      setProfile(unwrap(await window.electronAPI.getCinephileProfile({ refresh })));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (profile?.reason === 'insufficient-data') {
    return (
      <section className="cinephile cinephile--empty" aria-label="Tu perfil de cinéfilo">
        <span className="cinephile__label">Tu perfil de cinéfilo</span>
        <p className="cinephile__summary">
          Marca como vistos {profile.needed} {profile.needed === 1 ? 'título más' : 'títulos más'} y aquí aparecerá un retrato de tu gusto.
        </p>
      </section>
    );
  }

  const note = fallbackNote(profile, 'Este retrato se armó con tus números.');

  return (
    <section className="cinephile" aria-label="Tu perfil de cinéfilo" aria-busy={busy && !profile}>
      <div className="cinephile__lead">
        <div className="lower-third">
          <span className="lower-third__label"><span>Tu perfil de cinéfilo</span></span>
          <span className="lower-third__meta">
            <span>{profile?.source === 'ai' ? `Escrito por ${aiName(profile)}` : profile ? 'Calculado con tus números' : 'Cargando'}</span>
          </span>
        </div>

        {!profile && busy && <div className="skeleton skeleton--title cinephile__skeleton" />}
        {error && <p className="cinephile__error" role="alert">No se pudo armar tu perfil: {error}</p>}

        {profile?.reason === 'ok' && (
          <>
            <motion.h2
              key={profile.archetype}
              className="cinephile__archetype"
              initial={reduceMotion ? { opacity: 0 } : { clipPath: 'inset(0 100% 0 0)' }}
              animate={reduceMotion ? { opacity: 1 } : { clipPath: 'inset(0 0% 0 0)', transition: { duration: 0.55, ease: EASE } }}
            >
              {profile.archetype}
            </motion.h2>
            <p className="cinephile__summary">{profile.summary}</p>
            {profile.blindSpot && (
              <p className="cinephile__blind"><span className="cinephile__label">Punto ciego</span> {profile.blindSpot}</p>
            )}
          </>
        )}

        <div className="cinephile__actions">
          {profile?.stale && <span className="cinephile__stale" role="status">Tu catálogo cambió desde este retrato.</span>}
          <button className="btn btn--ghost btn--sm" onClick={() => load({ refresh: true })} disabled={busy}>
            {busy && profile && <IconSpinner />}
            {busy && profile ? 'Actualizando…' : 'Actualizar retrato'}
          </button>
        </div>
        {note && <p className="cinephile__note">{note}</p>}
      </div>

      {profile?.reason === 'ok' && (
        <ol className="cinephile__traits" aria-label="Rasgos">
          {profile.traits.map((t, i) => (
            <motion.li
              key={t.label}
              className="cinephile__trait"
              initial={{ opacity: 0, x: reduceMotion ? 0 : -12 }}
              animate={{ opacity: 1, x: 0, transition: { duration: 0.28, ease: EASE, delay: 0.25 + i * 0.06 } }}
            >
              <span className="cinephile__trait-label">{t.label}</span>
              <span className="cinephile__trait-detail">{t.detail}</span>
            </motion.li>
          ))}
        </ol>
      )}
    </section>
  );
}
