import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { IconCheck, IconSpinner } from './Icons';
import { useToast } from './Toast';
import { formatDate } from '../utils/labels';
import { unwrap } from '../utils/ai';

const pad = (n) => String(n).padStart(2, '0');
const code = (s, e) => `T${s} · E${pad(e)}`;

function airDate(date) {
  return date ? formatDate(`${date}T12:00:00`) : 'Sin fecha';
}

/**
 * Episode by episode progress on a series page: the overall bar, the next
 * episode to watch with a one-click mark, and each season's episodes as a
 * checklist. `onTitleChanged` receives the title when marking moved it to
 * "watching".
 */
export default function EpisodeTracker({ title, onTitleChanged }) {
  const showToast = useToast();
  const reduceMotion = useReducedMotion();
  const [tracker, setTracker] = useState(null);
  const [error,   setError]   = useState(null);
  const [season,  setSeason]  = useState(null);
  const [episodes, setEpisodes] = useState({}); // season number -> season data
  const [loadingSeason, setLoadingSeason] = useState(false);
  const [busy,    setBusy]    = useState(null); // key being saved

  async function loadTracker() {
    try {
      const t = unwrap(await window.electronAPI.getEpisodeTracker(title.id));
      setTracker(t);
      setSeason((current) => current ?? t.next?.season ?? t.seasons[0]?.number ?? null);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { loadTracker(); }, [title.id]);

  useEffect(() => {
    if (season == null || episodes[season] || !title.tmdb_id) return;
    let cancelled = false;
    setLoadingSeason(true);
    window.electronAPI.getSeasonEpisodes(title.id, season)
      .then(unwrap)
      .then((data) => { if (!cancelled) setEpisodes((prev) => ({ ...prev, [season]: data })); })
      .catch((err) => { if (!cancelled) showToast({ message: `No se pudo cargar la temporada: ${err.message}`, type: 'error' }); })
      .finally(() => { if (!cancelled) setLoadingSeason(false); });
    return () => { cancelled = true; };
  }, [season, title.id]);

  const watchedSet = useMemo(() => new Set((tracker?.watched ?? []).map((w) => `${w.season}:${w.episode}`)), [tracker]);

  async function mark(list, watched, key) {
    setBusy(key);
    try {
      const result = unwrap(await window.electronAPI.setEpisodesWatched(title.id, list, watched));
      if (result.title.status !== title.status) onTitleChanged?.(result.title);
      await loadTracker();
    } catch (err) {
      showToast({ message: err.message, type: 'error' });
    } finally {
      setBusy(null);
    }
  }

  if (error) return <p className="form-error" role="alert">No se pudo cargar el progreso de episodios: {error}</p>;
  if (!tracker) return null;
  if (!title.tmdb_id) return null;

  const { totals, next } = tracker;
  const share = totals.aired ? Math.min(100, Math.round((totals.watched / totals.aired) * 100)) : 0;
  const current = tracker.seasons.find((s) => s.number === season);
  const seasonData = episodes[season];
  const aired = (seasonData?.episodes ?? []).filter((e) => !e.upcoming);
  const seasonDone = current && aired.length > 0 && aired.every((e) => watchedSet.has(`${season}:${e.number}`));

  return (
    <section className="rail episodes" aria-labelledby="episodes-title">
      <header className="rail__header">
        <h2 className="rail__title" id="episodes-title">Episodios</h2>
        <span className="rail__tag">{totals.watched} de {totals.aired ?? '?'} vistos</span>
      </header>

      <div className="episodes__summary">
        <div className="episodes__bar" role="progressbar" aria-label="Episodios vistos" aria-valuemin={0} aria-valuemax={100} aria-valuenow={share}>
          <motion.span
            className="episodes__fill"
            initial={{ scaleX: reduceMotion ? share / 100 : 0 }}
            animate={{ scaleX: share / 100, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
          />
        </div>
        <div className="episodes__next">
          {next ? (
            <>
              <span className="episodes__label">Siguiente</span>
              <span className="episodes__code">{code(next.season, next.episode)}</span>
              <button
                className="btn btn--primary"
                onClick={() => mark([next], true, 'next')}
                disabled={busy !== null}
              >
                {busy === 'next' ? <IconSpinner /> : <IconCheck size={16} />}
                Marcar como visto
              </button>
            </>
          ) : totals.aired > 0 && totals.watched >= totals.aired ? (
            <span className="episodes__label">Vas al día</span>
          ) : (
            <span className="episodes__label">Marca el primer episodio que veas</span>
          )}
          {tracker.nextAiring?.air_date && (
            <span className="episodes__airing">
              Próximo estreno: {code(tracker.nextAiring.season, tracker.nextAiring.episode)} · {airDate(tracker.nextAiring.air_date)}
            </span>
          )}
        </div>
      </div>

      {tracker.seasons.length > 0 && (
        <div className="episodes__seasons" role="tablist" aria-label="Temporadas">
          {tracker.seasons.map((s) => (
            <button
              key={s.number}
              role="tab"
              aria-selected={s.number === season}
              className={`episodes__season${s.number === season ? ' is-active' : ''}${s.aired > 0 && s.watched >= s.aired ? ' is-done' : ''}`}
              onClick={() => setSeason(s.number)}
            >
              <span>T{s.number}</span>
              <small>{s.aired === 0 && !s.episode_count ? 'Pronto' : `${s.watched}/${s.aired || s.episode_count}`}</small>
            </button>
          ))}
        </div>
      )}

      {current && (
        <div className="episodes__panel" role="tabpanel" aria-label={current.name}>
          <div className="episodes__panel-head">
            <h3 className="episodes__panel-title">{current.name}</h3>
            {aired.length > 0 && (
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => mark(aired.map((e) => ({ season, episode: e.number })), !seasonDone, 'season')}
                disabled={busy !== null}
              >
                {busy === 'season' && <IconSpinner />}
                {seasonDone ? 'Desmarcar temporada' : 'Marcar temporada vista'}
              </button>
            )}
          </div>
          {loadingSeason && !seasonData && <p className="field-hint" role="status">Cargando episodios…</p>}
          {seasonData && seasonData.episodes.length === 0 && (
            <p className="field-hint" role="status">TMDB aún no publica los episodios de esta temporada.</p>
          )}
          {seasonData?.episodes.length > 0 && (
            <ol className="episode-list">
              {seasonData.episodes.map((e) => {
                const key = `${season}:${e.number}`;
                const seen = watchedSet.has(key);
                return (
                  <li key={key} className={`episode${seen ? ' is-seen' : ''}${e.upcoming ? ' is-upcoming' : ''}`}>
                    <button
                      type="button"
                      className="episode__check"
                      role="checkbox"
                      aria-checked={seen}
                      aria-label={`${code(season, e.number)}: ${e.name}`}
                      disabled={e.upcoming || busy !== null}
                      onClick={() => mark([{ season, episode: e.number }], !seen, key)}
                    >
                      {busy === key ? <IconSpinner size={14} /> : seen ? <IconCheck size={14} /> : null}
                    </button>
                    <span className="episode__number">{pad(e.number)}</span>
                    <span className="episode__name">{e.name}</span>
                    <span className="episode__meta">
                      {e.upcoming ? `Sale el ${airDate(e.air_date)}` : [airDate(e.air_date), e.runtime ? `${e.runtime} min` : null].filter(Boolean).join(' · ')}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
