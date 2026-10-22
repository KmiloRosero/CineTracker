import React, { useState } from 'react';
import { motion } from 'framer-motion';
import FixtureCard from './FixtureCard';
import { gridVariants } from './cardAnimations';
import { IconSearch, IconSpinner } from './Icons';
import { aiName, fallbackNote, unwrap } from '../utils/ai';

const CONFIDENCE_TAG = {
  high:   { text: 'Muy probable', tone: 'next' },
  medium: { text: 'Puede ser',    tone: 'here' },
  low:    { text: 'Quizás',       tone: 'soon' },
};

const EXAMPLES = [
  'Un tipo revive el mismo día una y otra vez en una guerra contra aliens',
  'Serie de una oficina donde a los empleados les separan los recuerdos del trabajo',
];

/** "¿Cuál era esa película?": describe what you remember, get real TMDB titles back. */
export default function DescribeSearch({ catalogIds, addingId, onAdd, onOpen }) {
  const [query,  setQuery]  = useState('');
  const [result, setResult] = useState(null);
  const [busy,   setBusy]   = useState(false);
  const [error,  setError]  = useState(null);

  async function search(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setResult(unwrap(await window.electronAPI.findByDescription(query)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const note = fallbackNote(result, 'Se buscó tu texto tal cual en TMDB, que encuentra títulos por nombre pero no por trama.');

  return (
    <section className="rail discover__section" aria-labelledby="describe-title">
      <header className="rail__header">
        <h2 className="rail__title" id="describe-title">¿Cuál era esa película?</h2>
        <span className="rail__tag">Búscala por lo que recuerdas</span>
      </header>

      <form className="describe" onSubmit={search} role="search">
        <label htmlFor="describe-input" className="sr-only">Describe la película o serie</label>
        <div className="describe__field">
          <IconSearch size={20} />
          <input
            id="describe-input"
            value={query}
            maxLength={400}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Esa peli donde un tipo revive el mismo día en una base militar…"
          />
        </div>
        <button type="submit" className="btn btn--primary btn--lg" disabled={busy || query.trim().length < 3}>
          {busy && <IconSpinner />}
          {busy ? 'Buscando…' : 'Encontrarla'}
        </button>
      </form>

      {!result && !error && (
        <p className="describe__examples">
          Por ejemplo:{' '}
          {EXAMPLES.map((ex, i) => (
            <React.Fragment key={ex}>
              {i > 0 && ' · '}
              <button type="button" className="describe__example" onClick={() => setQuery(ex)}>“{ex}”</button>
            </React.Fragment>
          ))}
        </p>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      {note && <p className="rail__note" role="status">{note}</p>}
      {result?.reason === 'no-results' && (
        <div className="rail__empty" role="status">No dimos con ella. Agrega algún detalle: un actor, la época, dónde pasa o cómo termina.</div>
      )}
      {result?.reason === 'ok' && (
        <motion.div className="fixture-grid" variants={gridVariants} initial="hidden" animate="visible" key={result.results.map((r) => r.tmdb_id).join()}>
          {result.results.map((r) => (
            <FixtureCard
              key={`${r.type}-${r.tmdb_id}`}
              item={r}
              tag={CONFIDENCE_TAG[r.confidence]}
              catalogId={catalogIds.get(`${r.type}:${r.tmdb_id}`)}
              explanation={r.clue}
              explanationSource={r.clue ? `Pista de ${aiName(result)}; el título se verificó en TMDB.` : undefined}
              reasonVisible
              adding={addingId === r.tmdb_id}
              onAdd={onAdd}
              onOpen={onOpen}
            />
          ))}
        </motion.div>
      )}
    </section>
  );
}
