import React, { useState } from 'react';
import { motion } from 'framer-motion';
import FixtureCard from './FixtureCard';
import { gridVariants } from './cardAnimations';
import { IconSpinner } from './Icons';
import { aiName, fallbackNote, unwrap } from '../utils/ai';

const MOODS = [
  'Algo ligero, estoy cansado',
  'Quiero pasar miedo',
  'Algo que me haga pensar',
  'Adrenalina pura',
  'Para llorar un rato',
  'Plan en pareja',
];

const RUNTIMES = [
  { value: 'any',     label: 'Sin límite' },
  { value: '90',      label: 'Hasta 90 min' },
  { value: '120',     label: 'Hasta 2 h' },
  { value: 'episode', label: 'Un episodio' },
];

const SOURCES = [
  { value: 'pending', label: 'Mis pendientes' },
  { value: 'new',     label: 'Algo nuevo' },
  { value: 'both',    label: 'Ambos' },
];

const MAX_MOOD = 300;

function Segmented({ label, options, value, onChange }) {
  return (
    <div className="tonight__field">
      <span className="tonight__label" id={`seg-${label}`}>{label}</span>
      <div className="segmented segmented--onair" role="radiogroup" aria-labelledby={`seg-${label}`}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={`segmented__option${value === o.value ? ' is-active' : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * "¿Qué veo esta noche?": the person says how they feel and how much time
 * they have; three picks come back, each with its reason. Catalog picks open
 * the title; new ones can be added. `platforms` is how many streaming
 * services the person saved (the "only on my platforms" switch needs one).
 */
export default function TonightPicker({ catalogIds, addingId, onAdd, onOpen, platforms = 0 }) {
  const [mood,    setMood]    = useState('');
  const [runtime, setRuntime] = useState('any');
  const [source,  setSource]  = useState('both');
  const [onMine,  setOnMine]  = useState(false);
  const [result,  setResult]  = useState(null);
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState(null);

  async function pick(e, { refresh = false } = {}) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setResult(unwrap(await window.electronAPI.pickTonight(
        { mood, runtime, source, platformsOnly: onMine && platforms > 0 },
        { refresh },
      )));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const note = fallbackNote(result, 'Se eligió con reglas: las palabras de tu ánimo, el tiempo y tus géneros favoritos.');
  const sourceLine = result?.source === 'ai' ? `Elegido por ${aiName(result)} con tu ánimo y tus calificaciones.` : 'Elegido con tu ánimo, el tiempo y tus géneros favoritos.';

  return (
    <section className="tonight" aria-labelledby="tonight-title">
      <form className="tonight__form" onSubmit={pick}>
        <h2 className="tonight__title" id="tonight-title">¿Qué veo esta noche?</h2>

        <div className="tonight__mood">
          <label className="tonight__label" htmlFor="tonight-mood">Cuéntame cómo estás</label>
          <textarea
            id="tonight-mood"
            rows={2}
            maxLength={MAX_MOOD}
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) pick(e); }}
            placeholder="Algo ligero, de 90 minutos, que estoy cansado…"
          />
          <div className="tonight__moods" role="group" aria-label="Ideas de ánimo">
            {MOODS.map((m) => (
              <button key={m} type="button" className="tonight__mood-chip" aria-pressed={mood === m} onClick={() => setMood(m)}>
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="tonight__options">
          <Segmented label="Tiempo" options={RUNTIMES} value={runtime} onChange={setRuntime} />
          <Segmented label="De dónde" options={SOURCES} value={source} onChange={setSource} />
          {platforms > 0 && source !== 'pending' && (
            <label className="tonight__check">
              <input type="checkbox" checked={onMine} onChange={(e) => setOnMine(e.target.checked)} />
              Solo en mis plataformas
            </label>
          )}
        </div>

        <div className="tonight__go">
          <button type="submit" className="btn btn--primary btn--lg" disabled={busy}>
            {busy && <IconSpinner />}
            {busy ? 'Eligiendo…' : 'Elige por mí'}
          </button>
          {result?.reason === 'ok' && (
            <button type="button" className="btn btn--ghost btn--lg tonight__again" onClick={(e) => pick(e, { refresh: true })} disabled={busy}>
              Otras tres
            </button>
          )}
        </div>
      </form>

      {error && <p className="form-error" role="alert">No se pudo elegir: {error}</p>}

      {result?.reason === 'insufficient-data' && (
        <p className="tonight__empty" role="status">Agrega algunos títulos a tu catálogo primero: así sabemos qué te gusta.</p>
      )}
      {result?.reason === 'no-options' && (
        <p className="tonight__empty" role="status">
          {source === 'pending'
            ? 'No hay pendientes que quepan en ese tiempo. Prueba con "Algo nuevo" o sin límite.'
            : 'No encontramos opciones con eso. Prueba con otra duración o con tus pendientes.'}
        </p>
      )}

      {result?.reason === 'ok' && (
        <div className="tonight__result" aria-live="polite">
          <p className="tonight__message">{result.message}</p>
          {note && <p className="tonight__note" role="status">{note}</p>}
          <motion.div className="fixture-grid tonight__picks" variants={gridVariants} initial="hidden" animate="visible" key={result.picks.map((p) => p.key).join()}>
            {result.picks.map((p, i) => (p.kind === 'catalog' ? (
              <FixtureCard
                key={p.key}
                title={p.title}
                order={i + 1}
                tag={p.started ? { text: 'A medias', tone: 'here' } : { text: 'Pendiente', tone: 'next' }}
                explanation={p.reason}
                explanationSource={sourceLine}
                reasonVisible
                onOpen={onOpen}
              />
            ) : (
              <FixtureCard
                key={p.key}
                item={p.item}
                order={i + 1}
                tag={{ text: 'Nuevo', tone: 'soon' }}
                catalogId={catalogIds.get(`${p.item.type}:${p.item.tmdb_id}`)}
                explanation={p.reason}
                explanationSource={sourceLine}
                reasonVisible
                adding={addingId === p.item.tmdb_id}
                onAdd={onAdd}
                onOpen={onOpen}
              />
            )))}
          </motion.div>
        </div>
      )}
    </section>
  );
}
