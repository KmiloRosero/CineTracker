import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import FixtureCard from './FixtureCard';
import TrailerModal from './TrailerModal';
import { gridVariants } from './cardAnimations';
import { IconSpinner } from './Icons';
import { aiName, fallbackNote, unwrap } from '../utils/ai';

// Ideas that show what can be asked: moods, topics, a title as a model, a country, an era.
const IDEAS = [
  'Algo ligero, estoy cansado',
  'Terror que de verdad dé miedo',
  'Algo como Interstellar',
  'Una serie de robos para maratonear',
  'Comedia para ver en pareja',
  'Thriller coreano con giros',
  'Un clásico de los 80',
  'Basada en hechos reales',
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

const MAX_MOOD = 400;
const STEP = 3;

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
 * "¿Qué veo esta noche?": the person writes what they feel like watching
 * (a mood, a topic, a title as a model, a country, an era) and how much
 * time they have; up to nine options come back, three at a time, each with
 * its reason, where to watch it and its trailer. "Otras opciones" never
 * repeats what was already shown. `platforms` is how many streaming
 * services the person saved (the "only on my platforms" switch needs one).
 */
export default function TonightPicker({ catalogIds, addingId, onAdd, onOpen, platforms = 0 }) {
  const [mood,    setMood]    = useState('');
  const [runtime, setRuntime] = useState('any');
  const [source,  setSource]  = useState('both');
  const [onMine,  setOnMine]  = useState(false);
  const [result,  setResult]  = useState(null);
  const [visible, setVisible] = useState(STEP);
  const [shown,   setShown]   = useState([]); // keys already offered for this request
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState(null);
  const [trailer, setTrailer] = useState(null);
  const [refining, setRefining] = useState(false);
  const request = useRef(0); // the newest search wins; older answers are dropped

  // Two answers per search: the rules' options at once, then (with an AI key)
  // the AI's, which replace them when they arrive.
  async function pick(e, { again = false } = {}) {
    e?.preventDefault();
    const id = ++request.current;
    setBusy(true);
    setRefining(false);
    setError(null);
    const exclude = again ? shown : [];
    const input = { mood, runtime, source, platformsOnly: onMine && platforms > 0, exclude };
    const keysOf = (r) => (r.picks ?? []).map((p) => p.key);
    let first;
    try {
      first = unwrap(await window.electronAPI.pickTonight(input, { refresh: again, fast: true }));
      if (id !== request.current) return;
      setResult(first);
      setVisible(STEP);
      setShown([...exclude, ...keysOf(first)]);
    } catch (err) {
      if (id === request.current) setError(err.message);
      return;
    } finally {
      if (id === request.current) setBusy(false);
    }
    if (!first.aiAvailable || first.reason !== 'ok') return;

    setRefining(true);
    try {
      const better = unwrap(await window.electronAPI.pickTonight(input, { refresh: again }));
      if (id !== request.current) return;
      if (better.reason === 'ok' && better.source === 'ai') {
        setResult(better);
        setVisible(STEP);
        setShown((prev) => [...new Set([...prev, ...keysOf(better)])]);
      } else {
        // keep the options on screen and say why the AI did not improve them
        setResult((prev) => ({ ...prev, provisional: false, provider: better.provider, fallbackReason: better.fallbackReason ?? 'empty-ai-response' }));
      }
    } catch {
      if (id === request.current) setResult((prev) => ({ ...prev, provisional: false, fallbackReason: 'api-error' }));
    } finally {
      if (id === request.current) setRefining(false);
    }
  }

  const note = refining || result?.provisional ? null : fallbackNote(result, 'Se eligió con reglas: lo que escribiste, el tiempo y tus géneros favoritos.');
  const sourceLine = result?.source === 'ai' ? `Elegido por ${aiName(result)} con tu pedido y tus calificaciones.` : 'Elegido con tu pedido, el tiempo y tus géneros favoritos.';
  const picks = result?.picks ?? [];
  const onScreen = picks.slice(0, visible);

  return (
    <section className="tonight" aria-labelledby="tonight-title">
      <form className="tonight__form" onSubmit={pick}>
        <h2 className="tonight__title" id="tonight-title">¿Qué veo esta noche?</h2>

        <div className="tonight__mood">
          <label className="tonight__label" htmlFor="tonight-mood">¿Qué tienes ganas de ver?</label>
          <textarea
            id="tonight-mood"
            rows={3}
            maxLength={MAX_MOOD}
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) pick(e); }}
            placeholder="Como quieras: “algo como Interstellar pero más corto”, “terror coreano de los 2000”, “una comedia para ver con mi novia, nada de terror”…"
          />
          <div className="tonight__moods" role="group" aria-label="Ideas">
            {IDEAS.map((m) => (
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
            {busy ? 'Buscando…' : 'Elige por mí'}
          </button>
          {busy && <span className="tonight__busy" role="status">Entendiendo lo que quieres y buscando en TMDB…</span>}
        </div>
      </form>

      {error && <p className="form-error" role="alert">No se pudo elegir: {error}</p>}

      {result?.reason === 'insufficient-data' && (
        <p className="tonight__empty" role="status">Escribe qué quieres ver, o agrega algunos títulos a tu catálogo para que sepamos qué te gusta.</p>
      )}
      {result?.reason === 'no-options' && (
        <p className="tonight__empty" role="status">
          {source === 'pending'
            ? 'Ninguno de tus pendientes encaja con eso. Prueba con "Algo nuevo" o "Ambos".'
            : 'No encontramos opciones con todo eso junto. Quita algún detalle o cambia la duración.'}
        </p>
      )}

      {result?.reason === 'ok' && (
        <div className="tonight__result" aria-live="polite">
          <p className="tonight__message">{result.message}</p>
          {result.chips?.length > 0 && (
            <p className="tonight__understood">
              <span className="tonight__understood-label">Entendí</span>
              {result.chips.map((c) => <span key={c} className="tonight__chip">{c}</span>)}
            </p>
          )}
          {refining && (
            <p className="tonight__refining" role="status">
              <IconSpinner /> {aiName(result) === 'la IA' ? 'La IA' : aiName(result)} está afinando estas opciones con tu pedido; puedes ir mirándolas.
            </p>
          )}
          {note && <p className="tonight__note" role="status">{note}</p>}
          <motion.div className="fixture-grid tonight__picks" variants={gridVariants} initial="hidden" animate="visible" key={result.generatedAt}>
            {onScreen.map((p, i) => (p.kind === 'catalog' ? (
              <FixtureCard
                key={p.key}
                title={p.title}
                order={i + 1}
                tag={p.started ? { text: 'A medias', tone: 'here' } : { text: 'Pendiente', tone: 'next' }}
                explanation={p.reason}
                explanationSource={sourceLine}
                reasonVisible
                providers={p.providers}
                onMine={p.onMine}
                onTrailer={p.title.tmdb_id ? () => setTrailer({ tmdbId: p.title.tmdb_id, type: p.title.type, title: p.title.title }) : undefined}
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
                providers={p.providers}
                onMine={p.onMine}
                onTrailer={() => setTrailer({ tmdbId: p.item.tmdb_id, type: p.item.type, title: p.item.title })}
                adding={addingId === p.item.tmdb_id}
                onAdd={onAdd}
                onOpen={onOpen}
              />
            )))}
          </motion.div>
          <div className="tonight__more">
            {visible < picks.length && (
              <button type="button" className="btn btn--ghost btn--lg" onClick={() => setVisible((v) => v + STEP)}>
                Ver {Math.min(STEP, picks.length - visible)} más
              </button>
            )}
            <button type="button" className="btn btn--ghost btn--lg" onClick={(e) => pick(e, { again: true })} disabled={busy}>
              {busy && <IconSpinner />}
              Otras opciones
            </button>
            <span className="tonight__count">{Math.min(visible, picks.length)} de {picks.length} · nunca te repetimos las de esta búsqueda</span>
          </div>
        </div>
      )}

      <TrailerModal
        open={trailer !== null}
        onClose={() => setTrailer(null)}
        tmdbId={trailer?.tmdbId}
        type={trailer?.type}
        title={trailer?.title ?? ''}
      />
    </section>
  );
}
