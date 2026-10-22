import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ScoreBug from './ScoreBug';
import { IconSpinner } from './Icons';
import { aiName, fallbackNote, unwrap } from '../utils/ai';

const HEADING = {
  predict:  '¿Te va a gustar?',
  liked:    '¿Por qué te gustó?',
  disliked: '¿Por qué no te convenció?',
};

const CONFIDENCE = { high: 'Confianza alta', medium: 'Confianza media', low: 'Confianza baja' };

/**
 * The title against the person's taste. Opens with the rules' reading (or a
 * saved AI answer, no new request); "Analizar con IA" asks the model.
 * Takes a catalog `titleId`, or `tmdb` = { tmdbId, type } for a title not
 * added yet. `version` changes when the rating does, so the reading follows it.
 */
export default function TitleInsight({ titleId, tmdb, version }) {
  const [data,  setData]  = useState(null);
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState(null);

  async function load({ refresh = false } = {}) {
    setBusy(refresh);
    setError(null);
    try {
      setData(unwrap(await (tmdb
        ? window.electronAPI.getTmdbInsight(tmdb.tmdbId, tmdb.type, { refresh })
        : window.electronAPI.getTitleInsight(titleId, { refresh }))));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, [titleId, tmdb?.tmdbId, tmdb?.type, version]);

  if (error && !data) return <p className="form-error" role="alert">No se pudo analizar el título: {error}</p>;
  if (!data) return null;

  if (data.reason === 'insufficient-data') {
    return (
      <section className="rail insight" aria-label="Análisis según tu gusto">
        <header className="rail__header"><h2 className="rail__title">¿Te va a gustar?</h2></header>
        <p className="rail__empty">Califica {data.needed} {data.needed === 1 ? 'título más' : 'títulos más'} y aquí verás si este encaja con tu gusto.</p>
      </section>
    );
  }

  const asked = data.source === 'ai';
  // without a key the hint below says it once; other failures say why
  const note = data.fallbackReason && !['not-asked', 'no-api-key'].includes(data.fallbackReason)
    ? fallbackNote(data, 'Se muestra la lectura con reglas.')
    : null;

  return (
    <section className="rail insight" aria-labelledby="insight-title">
      <header className="rail__header">
        <h2 className="rail__title" id="insight-title">{HEADING[data.mode]}</h2>
        <span className="rail__tag">{asked ? `Análisis de ${aiName(data)}` : 'Según tus notas'}</span>
        {data.aiAvailable && (
          <div className="rail__action">
            <button className="btn btn--ghost btn--sm" onClick={() => load({ refresh: true })} disabled={busy}>
              {busy && <IconSpinner />}
              {busy ? 'Analizando…' : asked ? 'Volver a analizar' : 'Analizar con IA'}
            </button>
          </div>
        )}
      </header>

      <div className="insight__body">
        <div className="insight__score">
          <ScoreBug value={data.score} readonly size="lg" />
          <span className="insight__score-label">{data.mode === 'predict' ? 'Tu nota probable' : 'Tu nota'}</span>
          {data.mode === 'predict' && <span className="insight__confidence">{CONFIDENCE[data.confidence]}</span>}
        </div>

        <div className="insight__copy">
          <p className="insight__verdict">{data.verdict}</p>
          <ul className="insight__reasons">
            {data.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
          {data.similar?.length > 0 && (
            <p className="insight__similar">
              <span>Se parece a</span>
              {data.similar.map((t) => (
                <Link key={t.id} to={`/title/${t.id}`} className="insight__chip">
                  {t.title}{t.rating != null ? ` · ${t.rating}` : ''}
                </Link>
              ))}
            </p>
          )}
          {data.stale && <p className="insight__meta" role="status">Tus notas cambiaron desde este análisis.</p>}
          {note && <p className="insight__meta" role="status">{note}</p>}
          {!data.aiAvailable && !asked && (
            <p className="insight__meta">Con una clave de Gemini en Perfil &gt; Claves de API, la IA te lo explica con más detalle.</p>
          )}
        </div>
      </div>
    </section>
  );
}
