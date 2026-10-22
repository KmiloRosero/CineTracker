import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import TrailerModal from '../components/TrailerModal';
import RelatedTitles from '../components/RelatedTitles';
import WatchProviders from '../components/WatchProviders';
import TitleInsight from '../components/TitleInsight';
import PeopleFollow from '../components/PeopleFollow';
import { PageLoading, PageError } from '../components/PageLoading';
import { IconCheck, IconPlay, IconPlus, IconSpinner } from '../components/Icons';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { usePosterColor } from '../hooks/usePosterColor';
import { getTitleDetails, toCatalogPayload } from '../services/tmdbApi';
import { canonicalGenres, genreLabel } from '../utils/genres';
import { tmdbImage } from '../utils/tmdbImage';
import { typeLabel } from '../utils/labels';
import { unwrap } from '../utils/ai';

const EASE = [0.16, 1, 0.3, 1];
const POSTER_TILT = -7;
const svg = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'square', 'aria-hidden': true };
const IconBack = () => <svg {...svg}><line x1="20" y1="12" x2="5" y2="12"/><polyline points="11 6 5 12 11 18"/></svg>;

/**
 * A TMDB title the person has not added yet, shown like a title page:
 * synopsis, cast, trailer, where to watch, "¿Te va a gustar?", people and
 * what comes next. Adding it (as pending or as already watched) moves to
 * its real title page. When it is already in the catalog, that page opens.
 */
export default function TitlePreview() {
  const { type, tmdbId } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const reduceMotion = useReducedMotion();

  const [detail,  setDetail]  = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [error,   setError]   = useState(null);
  const [adding,  setAdding]  = useState(null); // 'pending' | 'completed'
  const [trailerOpen, setTrailerOpen] = useState(false);
  const field = usePosterColor(tmdbImage(detail?.poster_path, 'w185'));

  const id = Number(tmdbId);
  const validType = type === 'movie' || type === 'series';

  async function loadCatalog() {
    if (!user) return [];
    const all = await window.electronAPI.getAllTitles({});
    if (all?.error) return [];
    setCatalog(all);
    return all;
  }

  useEffect(() => {
    if (!validType || !Number.isInteger(id)) { setError('Ese título no es válido.'); return undefined; }
    let cancelled = false;
    setDetail(null);
    setError(null);
    Promise.all([getTitleDetails(id, type), loadCatalog()])
      .then(([d, all]) => {
        if (cancelled) return;
        const owned = all.find((t) => t.tmdb_id === id && t.type === type);
        if (owned) navigate(`/title/${owned.id}`, { replace: true });
        else setDetail(d);
      })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [id, type, user]);

  const genres = useMemo(() => canonicalGenres(detail?.genres ?? []).map(genreLabel), [detail]);
  // the components below expect a catalog-shaped title
  const asTitle = useMemo(() => detail && ({ tmdb_id: id, type, title: detail.title }), [detail, id, type]);

  function add(status) {
    requireAuth(async () => {
      setAdding(status);
      try {
        const created = unwrap(await window.electronAPI.addTitle({ ...toCatalogPayload(detail), status }));
        showToast({ message: status === 'completed' ? `"${detail.title}" quedó como vista. Califícala aquí.` : `"${detail.title}" quedó como pendiente.` });
        navigate(`/title/${created.id}`, { replace: true });
      } catch (err) {
        showToast({ message: `No se pudo agregar: ${err.message}`, type: 'error' });
        setAdding(null);
      }
    });
  }

  if (error) return <PageError message={`No se pudo abrir el título: ${error}`} onRetry={() => navigate(0)} />;
  if (!detail) return <PageLoading message="Cargando título…" />;

  const meta = [typeLabel(type), detail.release_year, detail.runtime ? `${detail.runtime} min${type === 'series' ? ' por episodio' : ''}` : null].filter(Boolean);
  const cast = (detail.cast ?? []).slice(0, 6);
  const posterSrc = tmdbImage(detail.poster_path, 'w780');
  const wipe = (delay) => ({
    hidden:  reduceMotion ? { opacity: 0 } : { scaleX: 0 },
    visible: reduceMotion ? { opacity: 1 } : { scaleX: 1, transition: { duration: 0.28, ease: EASE, delay } },
  });

  return (
    <div className="title-detail-page">
      <div className="showcase" style={{ '--field': field }}>
        <div className="showcase__field" aria-hidden="true" />

        <motion.div key={id} className="showcase__stage" initial="hidden" animate="visible">
          <div className="showcase__copy">
            <motion.h1
              className="showcase__title"
              variants={{
                hidden:  reduceMotion ? { opacity: 0 } : { clipPath: 'inset(0 100% 0 0)' },
                visible: reduceMotion ? { opacity: 1 } : { clipPath: 'inset(0 0% 0 0)', transition: { duration: 0.55, ease: EASE, delay: 0.05 } },
              }}
            >
              {detail.title}
            </motion.h1>
            {detail.original_title && detail.original_title !== detail.title && (
              <p className="showcase__original">{detail.original_title}</p>
            )}

            <div className="lower-third">
              <motion.span className="lower-third__label" variants={wipe(0.4)}><span>No está en tu catálogo</span></motion.span>
              <motion.span className="lower-third__meta" variants={wipe(0.48)}><span>{meta.join(' · ')}</span></motion.span>
            </div>

            {genres.length > 0 && (
              <ul className="showcase__genres" aria-label="Géneros">
                {genres.map((g) => <li key={g}>{g}</li>)}
              </ul>
            )}

            {detail.overview
              ? <p className="showcase__overview">{detail.overview}</p>
              : <p className="showcase__overview">TMDB aún no tiene sinopsis de este título.</p>}

            {cast.length > 0 && (
              <div className="showcase__cast">
                <span className="showcase__label">Reparto</span>
                <ul>
                  {cast.map((c) => (
                    <li key={`${c.name}-${c.character ?? ''}`}>
                      <span className="showcase__cast-name">{c.name}</span>
                      {c.character && <span className="showcase__cast-role">{c.character}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="showcase__actions">
              <button className="btn btn--primary btn--lg" onClick={() => add('pending')} disabled={adding !== null}>
                {adding === 'pending' ? <IconSpinner /> : <IconPlus size={18} />}
                {adding === 'pending' ? 'Agregando…' : 'Agregar a pendientes'}
              </button>
              <button className="btn btn--ghost btn--lg" onClick={() => add('completed')} disabled={adding !== null}>
                {adding === 'completed' ? <IconSpinner /> : <IconCheck size={18} />}
                Ya la vi
              </button>
              <button className="btn btn--ghost btn--lg" onClick={() => setTrailerOpen(true)}>
                <IconPlay size={18} /> Ver tráiler
              </button>
            </div>
          </div>

          <motion.div
            className="showcase__poster"
            variants={{
              hidden:  reduceMotion ? { opacity: 0 } : { opacity: 0, rotate: 0, scale: 0.86, y: 24 },
              visible: reduceMotion
                ? { opacity: 1, rotate: POSTER_TILT }
                : { opacity: 1, rotate: POSTER_TILT, scale: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
            }}
          >
            {posterSrc
              ? <img src={posterSrc} alt={`Póster de ${detail.title}`} />
              : <div className="showcase__poster-fallback" aria-hidden="true" />}
          </motion.div>
        </motion.div>

        <nav className="side-controls" aria-label="Controles del título">
          <button className="side-controls__btn" onClick={() => navigate(-1)} aria-label="Volver"><IconBack /></button>
        </nav>

        <div className="showcase__more">
          {user && <TitleInsight tmdb={{ tmdbId: id, type }} />}
          {user && <PeopleFollow title={asTitle} />}
          <WatchProviders title={asTitle} />
          <RelatedTitles
            key={`${type}-${id}`}
            title={asTitle}
            catalog={catalog}
            onOpen={(titleId) => navigate(`/title/${titleId}`)}
            onCatalogChanged={loadCatalog}
          />
        </div>
      </div>

      <TrailerModal open={trailerOpen} onClose={() => setTrailerOpen(false)} tmdbId={id} type={type} title={detail.title} />
    </div>
  );
}
