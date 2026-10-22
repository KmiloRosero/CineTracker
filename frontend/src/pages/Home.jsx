import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import FixtureCard from '../components/FixtureCard';
import TrailerModal from '../components/TrailerModal';
import Rail, { RailEmpty } from '../components/Rail';
import { PageError } from '../components/PageLoading';
import { useAuth } from '../context/AuthContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { StatTicker, CrawlTicker, trendOf } from '../components/Ticker';
import { getTrending, getTitleDetails, toCatalogPayload } from '../services/tmdbApi';
import { canonicalGenres, genreLabel } from '../utils/genres';
import { typeLabel } from '../utils/labels';
import { tmdbImage } from '../utils/tmdbImage';

// Why the AI picks were replaced by genre-based ones, in the user's terms.
// `ai` is the provider's display name (Gemini or Claude).
const FALLBACK_NOTE = {
  'no-api-key':        () => 'Agrega una clave de Gemini en Perfil > Claves de API para recibir recomendaciones escritas por IA. Por ahora se muestran según tus géneros.',
  'insufficient-data': (ai) => `Califica al menos 3 títulos y deja algunos como Pendiente para recibir recomendaciones de ${ai}.`,
  'offline':           (ai) => `No se pudo conectar con ${ai} (revisa tu conexión). Se muestran recomendaciones según tus géneros.`,
  'rate-limited':      (ai) => `${ai} está ocupado ahora mismo. Se muestran recomendaciones según tus géneros; prueba Actualizar en un minuto.`,
  'invalid-api-key':   (ai) => `La clave de ${ai} fue rechazada. Se muestran recomendaciones según tus géneros.`,
  'api-permission':    (ai) => `La clave de ${ai} no puede usar este modelo. Se muestran recomendaciones según tus géneros.`,
  'api-error':         (ai) => `${ai} devolvió un error. Se muestran recomendaciones según tus géneros.`,
  'refused':           (ai) => `${ai} rechazó la solicitud. Se muestran recomendaciones según tus géneros.`,
  'invalid-response':  (ai) => `No se pudo usar la respuesta de ${ai}. Se muestran recomendaciones según tus géneros.`,
  'empty-ai-response': (ai) => `${ai} no encontró coincidencias en tu lista. Se muestran recomendaciones según tus géneros.`,
};

const AI_NAME  = { gemini: 'Gemini', claude: 'Claude' };
const aiName   = (recs) => AI_NAME[recs?.provider] ?? 'la IA';
const aiSource = (ai) => `Escrito por ${ai} tras comparar este título con los que calificaste.`;
const RULE_SOURCE = 'Basado en cuántas veces calificaste estos géneros con 8 o más.';

const NO_REC_MSG = {
  'no-ratings': 'Califica con 8 o más los títulos que termines para desbloquear recomendaciones.',
  'no-pending': 'Agrega títulos como Pendiente para recibir sugerencias de tu propia lista.',
  'no-match':   'Ninguno de tus pendientes coincide aún con tus géneros favoritos. Sigue calificando.',
};

/** "T2 · E05 salió el 12 oct · vas 2 atrás" for the Nuevos episodios rail. */
function episodeLine(n) {
  const ep = n.kind === 'new' ? n.lastEpisode : n.nextEpisode;
  const code = `T${ep.season} · E${String(ep.episode).padStart(2, '0')}`;
  const date = new Date(`${ep.air_date}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  if (n.kind === 'soon') return `${code} sale el ${date}`;
  const behind = n.behind > 1 ? ` · te faltan ${n.behind}` : '';
  return `${code} salió el ${date}${behind}`;
}

const FEATURED_COUNT = 8;
const DECK_SIZE      = 3;
const ROTATE_MS      = 7000;
const FADE_S         = 1.4;
const EASE           = [0.16, 1, 0.3, 1];

function unwrap(result) {
  if (result?.error) throw new Error(result.error);
  return result;
}

// ── Icons ─────────────────────────────────────────────────────────────────
const svg = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'square', 'aria-hidden': true };
const IconArrow = () => <svg {...svg}><line x1="4" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>;
const IconPlus  = () => <svg {...svg}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconTrailer = () => <svg {...svg} strokeWidth={2}><polygon points="7 4 20 12 7 20" fill="currentColor"/></svg>;
const IconPause = () => <svg {...svg}><line x1="8" y1="5" x2="8" y2="19"/><line x1="16" y1="5" x2="16" y2="19"/></svg>;
const IconPlay  = () => <svg {...svg} fill="currentColor" strokeWidth={0}><polygon points="7 4 20 12 7 20"/></svg>;
function IconSpinner() {
  return (
    <svg {...svg} strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}

// ── Featured-title model ──────────────────────────────────────────────────
function fromLocal(t, label) {
  return {
    key: `local-${t.id}`,
    title: t.title,
    backdrop: t.backdrop_path,
    poster: t.poster_path,
    overview: t.overview,
    year: t.release_year,
    runtime: t.runtime,
    type: t.type,
    genres: canonicalGenres(t.genres).map(genreLabel),
    label,
    localId: t.id,
    tmdbId: t.tmdb_id ?? null,
    tmdbItem: null,
  };
}

function fromTrending(item, rank, catalogId) {
  return {
    key: `tmdb-${item.type}-${item.tmdb_id}`,
    title: item.title,
    backdrop: item.backdrop_path,
    poster: item.poster_path,
    overview: item.overview,
    year: item.release_year,
    runtime: null,
    type: item.type,
    genres: [],
    label: `Tendencia #${rank}`,
    localId: catalogId ?? null,
    tmdbId: item.tmdb_id,
    tmdbItem: item,
  };
}

const backdropOf = (f) => tmdbImage(f.backdrop, 'w1280') ?? tmdbImage(f.poster, 'w780');

// ── Ticker: the stats strip that closes the stage ─────────────────────────
function Ticker({ overview, trending }) {
  if (overview) {
    const t = overview.trends ?? {};
    return (
      <StatTicker
        tag="Tu catálogo"
        sub="± vs. el mes pasado"
        label="Tu catálogo en números"
        items={[
          { label: 'Títulos',    value: overview.totals.titles, trend: trendOf(t.titlesAdded) },
          // status changes are not dated, so "watching" has no monthly trend
          { label: 'Viendo',     value: overview.totals.watching },
          { label: 'Completados', value: overview.totals.completed, trend: trendOf(t.completed) },
          { label: 'Horas',      value: overview.totalHours, decimals: overview.totalHours % 1 ? 1 : 0, trend: trendOf(t.hours, 1) },
          // catalogue average has no dated history; a watch-average delta would mislead
          { label: 'Nota media', value: overview.averageRating, decimals: 1 },
        ]}
      />
    );
  }
  if (trending.length > 0) return <CrawlTicker tag="Tendencias" names={trending.map((t) => t.title)} />;
  return null;
}

// ── Stage (first viewport): a backdrop slideshow ──────────────────────────
// Titles advance on their own every ROTATE_MS with a cross-fade and a slow
// push-in. Rotation pauses while the pointer is on a control, while a control
// has keyboard focus, while the window is hidden, or when the viewer pauses it.
function Stage({ featured, onPrimary, primaryState, onTrailer, holdRotation = false, user, onLogin, onBrowse, children }) {
  const reduceMotion = useReducedMotion();
  const [active, setActive]         = useState(0);
  const [hoverPause, setHoverPause] = useState(false);
  const [focusPause, setFocusPause] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [hidden, setHidden]         = useState(() => document.hidden);
  const keys = featured.map((f) => f.key).join('|');
  const paused = hoverPause || focusPause || userPaused || hidden || holdRotation;
  const count = featured.length;

  useEffect(() => { setActive(0); }, [keys]);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // one timer per slide; resuming restarts the current slide's countdown
  useEffect(() => {
    if (paused || count < 2) return undefined;
    const id = setTimeout(() => setActive((i) => (i + 1) % count), ROTATE_MS);
    return () => clearTimeout(id);
  }, [active, paused, count]);

  // warm the next backdrop so the cross-fade never shows an empty frame
  useEffect(() => {
    if (count < 2) return;
    const next = featured[(active + 1) % count];
    const src = next && backdropOf(next);
    if (src) new Image().src = src;
  }, [active, keys]);

  const current = featured[active];
  if (!current) return null;

  // the deck shows the next titles in order, so the lineup reads left to right
  const deck = Array.from({ length: Math.min(DECK_SIZE, count - 1) }, (_, i) => featured[(active + 1 + i) % count]);
  const meta = [
    current.year,
    current.runtime ? `${current.runtime} min` : null,
    typeLabel(current.type),
    current.genres.slice(0, 2).join(' / ') || null,
  ].filter(Boolean);
  const backdrop = backdropOf(current);
  const { label: actionLabel, icon: actionIcon, busy } = primaryState(current);
  const pad = (n) => String(n).padStart(2, '0');

  // keyboard focus on a control pauses; a mouse click does not
  const focusHandlers = {
    onFocus: (e) => { if (e.target.matches(':focus-visible')) setFocusPause(true); },
    onBlur:  () => setFocusPause(false),
  };
  const hoverHandlers = {
    onMouseEnter: () => setHoverPause(true),
    onMouseLeave: () => setHoverPause(false),
  };

  return (
    <section
      className="stage"
      aria-roledescription="carrusel"
      aria-label="Títulos destacados"
      style={{ '--rotate-ms': `${ROTATE_MS}ms` }}
      {...focusHandlers}
    >
      <div className="stage__backdrop" aria-hidden="true">
        <AnimatePresence initial={false}>
          {backdrop && (
            <motion.img
              key={current.key}
              src={backdrop}
              alt=""
              initial={{ opacity: 0, scale: 1 }}
              animate={{
                opacity: 1,
                scale: reduceMotion ? 1 : 1.08,
                transition: {
                  opacity: { duration: FADE_S, ease: 'easeInOut' },
                  scale:   { duration: ROTATE_MS / 1000 + FADE_S, ease: 'linear' },
                },
              }}
              exit={{ opacity: 0, transition: { duration: FADE_S, ease: 'easeInOut' } }}
            />
          )}
        </AnimatePresence>
        <div className="stage__grade" />
        <div className="stage__horizon" />
      </div>

      <div className="stage__copy">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.key}
            className="stage__copy-inner"
            initial="hidden"
            animate="visible"
            exit="exit"
            aria-live={paused ? 'polite' : 'off'}
          >
            <motion.h1
              className="stage__title"
              variants={{
                hidden:  reduceMotion ? { opacity: 0 } : { clipPath: 'inset(0 100% 0 0)' },
                visible: reduceMotion ? { opacity: 1 } : { clipPath: 'inset(0 0% 0 0)', transition: { duration: 0.5, ease: EASE, delay: 0.12 } },
                exit:    { opacity: 0, transition: { duration: 0.18 } },
              }}
            >
              {current.title}
            </motion.h1>

            <div className="lower-third">
              <motion.span
                className="lower-third__label"
                variants={{
                  hidden:  reduceMotion ? { opacity: 0 } : { scaleX: 0 },
                  visible: reduceMotion ? { opacity: 1 } : { scaleX: 1, transition: { duration: 0.28, ease: EASE } },
                  exit:    { opacity: 0, transition: { duration: 0.15 } },
                }}
              >
                <span>{current.label}</span>
              </motion.span>
              <motion.span
                className="lower-third__meta"
                variants={{
                  hidden:  reduceMotion ? { opacity: 0 } : { scaleX: 0 },
                  visible: reduceMotion ? { opacity: 1 } : { scaleX: 1, transition: { duration: 0.28, ease: EASE, delay: 0.08 } },
                  exit:    { opacity: 0, transition: { duration: 0.15 } },
                }}
              >
                <span>{meta.join(' · ')}</span>
              </motion.span>
            </div>

            {current.overview && <p className="stage__overview">{current.overview}</p>}
          </motion.div>
        </AnimatePresence>

        <div className="stage__actions" {...hoverHandlers}>
          <button className="btn btn--primary btn--lg" onClick={() => onPrimary(current)} disabled={busy}>
            {busy ? <IconSpinner /> : actionIcon}
            {actionLabel}
          </button>
          {current.tmdbId && (
            <button className="btn btn--ghost btn--lg stage__ghost" onClick={() => onTrailer(current)}>
              <IconTrailer /> Ver tráiler
            </button>
          )}
          {user
            ? <button className="btn btn--ghost btn--lg stage__ghost" onClick={onBrowse}>Ver catálogo</button>
            : <button className="btn btn--ghost btn--lg stage__ghost" onClick={onLogin}>Iniciar sesión</button>}
        </div>

        {count > 1 && (
          <div className="stage__controls" {...hoverHandlers}>
            <button
              type="button"
              className="stage__pause"
              onClick={() => setUserPaused((v) => !v)}
              aria-label={userPaused ? 'Reanudar el carrusel' : 'Pausar el carrusel'}
              aria-pressed={userPaused}
            >
              {userPaused ? <IconPlay /> : <IconPause />}
            </button>
            <span className="stage__count" aria-hidden="true">{pad(active + 1)} / {pad(count)}</span>
            <div className="stage__dots" role="tablist" aria-label="Elegir título destacado">
              {featured.map((f, i) => (
                <button
                  key={f.key}
                  role="tab"
                  aria-selected={i === active}
                  aria-label={f.title}
                  className={`stage__dot${i === active ? ' is-active' : ''}${paused ? ' is-paused' : ''}`}
                  onClick={() => setActive(i)}
                >
                  {/* keyed per slide and run so the fill restarts with each countdown */}
                  {i === active && <span key={`${active}-${paused}`} className="stage__dot-fill" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {deck.length > 0 && (
        <div className="stage__deck" role="group" aria-label="A continuación" {...hoverHandlers}>
          {deck.map((f, slot) => (
            <motion.button
              key={f.key}
              layout={!reduceMotion}
              type="button"
              className={`stage__card stage__card--${slot}`}
              onClick={() => setActive(featured.indexOf(f))}
              aria-label={`Destacar ${f.title}`}
              transition={{ layout: { duration: 0.6, ease: EASE } }}
              whileHover={reduceMotion ? undefined : { y: -10, rotate: 0, transition: { duration: 0.25, ease: EASE } }}
              whileTap={{ scale: 0.97 }}
            >
              {f.poster
                ? <img src={tmdbImage(f.poster, 'w342')} alt="" />
                : <span className="stage__card-fallback">{f.title}</span>}
              <span className="stage__card-label">{f.label}</span>
            </motion.button>
          ))}
        </div>
      )}

      {children}
    </section>
  );
}

function StageSkeleton() {
  return (
    <section className="stage stage--loading" aria-busy="true" aria-label="Cargando títulos destacados">
      <div className="stage__copy">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--bar" />
        <div className="skeleton skeleton--line" />
      </div>
    </section>
  );
}

// ── Home ──────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const { user, openLoginModal } = useAuth();
  const requireAuth = useRequireAuth();

  const [titles,    setTitles]    = useState([]);
  const [overview,  setOverview]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [recs,        setRecs]        = useState(null);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError,   setRecsError]   = useState(null);

  const [trending,        setTrending]        = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingError,   setTrendingError]   = useState(null);
  const [addingTmdbId,    setAddingTmdbId]    = useState(null);
  const [addError,        setAddError]        = useState(null);
  const [trailerFor,      setTrailerFor]      = useState(null);
  const [tmdbMissing,     setTmdbMissing]     = useState(false);
  const [newEpisodes,     setNewEpisodes]     = useState([]);

  async function refreshTitles() {
    const all = unwrap(await window.electronAPI.getAllTitles({}));
    setTitles(all);
    return all;
  }

  // ── the user's own data ───────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setTitles([]); setOverview(null); setRecs(null); setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true); setError(null);
    Promise.all([
      window.electronAPI.getAllTitles({}).then(unwrap),
      window.electronAPI.getStatsOverview().then(unwrap),
    ])
      .then(([all, stats]) => { if (!cancelled) { setTitles(all); setOverview(stats); } })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, reloadKey]);

  // ── recommendations, after the catalog is ready ──────────────────────
  async function loadRecommendations({ refresh = false } = {}) {
    setRecsLoading(true);
    setRecsError(null);
    try {
      setRecs(unwrap(await window.electronAPI.getAIRecommendations({ refresh })));
    } catch (err) {
      setRecsError(err.message);
    } finally {
      setRecsLoading(false);
    }
  }

  useEffect(() => {
    if (!user || loading) return;
    loadRecommendations();
  }, [user, loading]);

  // followed series with an episode out (or about to be): checked once per visit
  useEffect(() => {
    if (!user) { setNewEpisodes([]); return undefined; }
    let cancelled = false;
    window.electronAPI.getNewEpisodes()
      .then((r) => { if (!cancelled && Array.isArray(r)) setNewEpisodes(r); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user, reloadKey]);

  // ── TMDB trending (public) ────────────────────────────────────────────
  useEffect(() => {
    getTrending(20)
      .then(setTrending)
      .catch((err) => setTrendingError(err.message))
      .finally(() => setTrendingLoading(false));
    // a build without keys: guide the first run instead of showing an empty stage
    window.electronAPI.getApiKeys()
      .then((r) => setTmdbMissing(!r?.error && !r?.keys?.tmdb?.source))
      .catch(() => {});
  }, []);

  function openKeySettings() {
    requireAuth(() => navigate('/profile', { state: { focus: 'api-keys' } }));
  }

  const catalogByTmdbId = useMemo(() => {
    const map = new Map();
    titles.forEach((t) => { if (t.tmdb_id != null) map.set(t.tmdb_id, t.id); });
    return map;
  }, [titles]);

  const watching        = useMemo(() => titles.filter((t) => t.status === 'watching'), [titles]);
  const recommendations = useMemo(() => recs?.recommendations ?? [], [recs]);
  const recent          = titles.slice(0, 6);

  // Featured lineup: your own titles first, topped up with this week's trending.
  const featured = useMemo(() => {
    const seen = new Set();
    const keep = (f) => {
      if (seen.has(f.key) || !(f.backdrop || f.poster)) return false;
      seen.add(f.key);
      return true;
    };
    const own = user
      ? [
          ...watching.map((t) => fromLocal(t, 'Viendo ahora')),
          ...recommendations.map((t) => fromLocal(t, 'Para ti')),
          ...titles.filter((t) => t.backdrop_path).map((t) => fromLocal(t, 'Recién agregado')),
        ].filter(keep)
      : [];
    const inCatalog = new Set(titles.map((t) => t.tmdb_id).filter((id) => id != null));
    const fill = trending
      .filter((t) => t.backdrop_path && !inCatalog.has(t.tmdb_id))
      .map((t, i) => fromTrending(t, i + 1, catalogByTmdbId.get(t.tmdb_id)))
      .filter(keep);
    return [...own, ...fill].slice(0, FEATURED_COUNT);
  }, [user, titles, watching, recommendations, trending, catalogByTmdbId]);

  function handleAddTrending(item) {
    requireAuth(async () => {
      setAddingTmdbId(item.tmdb_id);
      setAddError(null);
      try {
        const detail = await getTitleDetails(item.tmdb_id, item.type);
        unwrap(await window.electronAPI.addTitle(toCatalogPayload(detail)));
        await refreshTitles();
      } catch (err) {
        setAddError(`No se pudo agregar "${item.title}": ${err.message}`);
      } finally {
        setAddingTmdbId(null);
      }
    });
  }

  function primaryState(f) {
    if (f.localId) return { label: 'Ver título', icon: <IconArrow /> };
    return { label: 'Agregar al catálogo', icon: <IconPlus />, busy: addingTmdbId === f.tmdbItem?.tmdb_id };
  }

  function handlePrimary(f) {
    if (f.localId) navigate(`/title/${f.localId}`);
    else if (f.tmdbItem) handleAddTrending(f.tmdbItem);
  }

  const openTitle  = (id) => navigate(`/title/${id}`);
  const stageReady = !trendingLoading && !(user && loading);

  if (error) {
    return <PageError message={`No se pudo cargar tu catálogo: ${error}`} onRetry={() => setReloadKey((k) => k + 1)} />;
  }

  return (
    <main className="home">
      {!stageReady && <StageSkeleton />}
      {stageReady && featured.length > 0 && (
        <Stage
          featured={featured}
          user={user}
          primaryState={primaryState}
          onPrimary={handlePrimary}
          onLogin={() => openLoginModal()}
          onBrowse={() => navigate('/catalog')}
          onTrailer={setTrailerFor}
          holdRotation={trailerFor !== null}
        >
          <Ticker overview={user ? overview : null} trending={trending} />
        </Stage>
      )}
      {stageReady && featured.length === 0 && tmdbMissing && (
        <section className="stage stage--empty stage--setup" aria-labelledby="setup-title">
          <div className="stage__copy">
            <h1 className="stage__title" id="setup-title">Configura CineTracker</h1>
            <p className="stage__overview">
              Para buscar películas y series, ver las tendencias y sus tráilers, CineTracker necesita una clave de TMDB. Es gratis y toma un par de minutos.
            </p>
            <ol className="setup-steps">
              <li><span className="setup-steps__n">1</span>{user ? 'Ya tienes tu cuenta.' : 'Crea una cuenta o inicia sesión.'}</li>
              <li><span className="setup-steps__n">2</span>Consigue tu clave en themoviedb.org (Ajustes → API).</li>
              <li><span className="setup-steps__n">3</span>Pégala en Perfil → Claves de API. Si quieres recomendaciones con IA, agrega también una clave de Gemini.</li>
            </ol>
            <div className="stage__actions">
              <button className="btn btn--primary btn--lg" onClick={openKeySettings}>
                Configurar claves
              </button>
              <button className="btn btn--ghost btn--lg stage__ghost" onClick={() => window.electronAPI.openKeyPage('tmdb')}>
                Conseguir una clave de TMDB
              </button>
            </div>
          </div>
        </section>
      )}
      {stageReady && featured.length === 0 && !tmdbMissing && (
        <section className="stage stage--empty">
          <div className="stage__copy">
            <h1 className="stage__title">Tu catálogo empieza aquí</h1>
            <p className="stage__overview">
              {trendingError
                ? `Las tendencias no están disponibles ahora (${trendingError}). Igual puedes agregar títulos a mano.`
                : 'Agrega la primera película o serie que estés viendo.'}
            </p>
            <div className="stage__actions">
              <button className="btn btn--primary btn--lg" onClick={() => requireAuth(() => navigate('/catalog'))}>
                <IconPlus /> Agregar un título
              </button>
            </div>
          </div>
        </section>
      )}

      <TrailerModal
        open={trailerFor !== null}
        onClose={() => setTrailerFor(null)}
        tmdbId={trailerFor?.tmdbId}
        type={trailerFor?.type}
        title={trailerFor?.title ?? ''}
      />

      <div className="home__rails">
        {addError && <p className="form-error" role="alert">{addError}</p>}

        {user && watching.length > 0 && (
          <Rail title="Sigue viendo" sub={`${watching.length} en curso`}>
            {watching.slice(0, 6).map((t) => <FixtureCard key={t.id} title={t} onOpen={openTitle} />)}
          </Rail>
        )}

        {user && newEpisodes.length > 0 && (
          <Rail title="Nuevos episodios" sub={`${newEpisodes.filter((n) => n.kind === 'new').length} por ver`}>
            {newEpisodes.slice(0, 6).map((n) => (
              <FixtureCard
                key={n.title.id}
                title={n.title}
                onOpen={openTitle}
                tag={n.kind === 'new' ? { text: 'Nuevo', tone: 'next' } : { text: 'Pronto', tone: 'soon' }}
                dateLine={episodeLine(n)}
              />
            ))}
          </Rail>
        )}

        {user && (
          <Rail
            title="Recomendados para ti"
            sub={recs ? (recs.source === 'ai' ? `Elegidos por ${aiName(recs)}` : 'Según tus géneros favoritos') : undefined}
            action={
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => loadRecommendations({ refresh: true })}
                disabled={recsLoading}
                aria-label="Actualizar recomendaciones"
              >
                {recsLoading && <IconSpinner />}
                {recsLoading ? 'Actualizando…' : 'Actualizar'}
              </button>
            }
            note={recs?.source === 'rule-based' ? FALLBACK_NOTE[recs.fallbackReason]?.(aiName(recs)) ?? null : null}
            empty={
              recsError ? <RailEmpty>No se pudieron cargar las recomendaciones: {recsError}</RailEmpty>
              : !recs && recsLoading ? <RailEmpty>Buscando títulos que encajen con tu gusto…</RailEmpty>
              : recommendations.length === 0 ? <RailEmpty>{NO_REC_MSG[recs?.reason] ?? 'Aún no hay recomendaciones.'}</RailEmpty>
              : undefined
            }
          >
            {recommendations.map((t) => (
              <FixtureCard
                key={t.id}
                title={t}
                explanation={t.explanation}
                explanationSource={recs.source === 'ai' ? aiSource(aiName(recs)) : RULE_SOURCE}
                onOpen={openTitle}
              />
            ))}
          </Rail>
        )}

        <Rail
          title="Tendencias de la semana"
          sub="Desde TMDB"
          empty={
            trendingLoading ? <RailEmpty>Cargando tendencias…</RailEmpty>
            : trendingError ? <RailEmpty>Las tendencias no están disponibles ahora. {trendingError}</RailEmpty>
            : undefined
          }
        >
          {trending.slice(0, 9).map((item) => (
            <FixtureCard
              key={`${item.type}-${item.tmdb_id}`}
              item={item}
              catalogId={catalogByTmdbId.get(item.tmdb_id)}
              adding={addingTmdbId === item.tmdb_id}
              onAdd={handleAddTrending}
              onOpen={openTitle}
            />
          ))}
        </Rail>

        {user && (
          <Rail
            title="Agregados recientemente"
            action={titles.length > 0 && <button className="btn btn--ghost btn--sm" onClick={() => navigate('/catalog')}>Ver todo</button>}
            empty={titles.length === 0
              ? <RailEmpty>Aún no hay nada. Agrega un título desde Tendencias o el Catálogo.</RailEmpty>
              : undefined}
          >
            {recent.map((t) => <FixtureCard key={t.id} title={t} onOpen={openTitle} />)}
          </Rail>
        )}

        {!user && (
          <section className="home__signup">
            <h2 className="home__signup-title">Lleva el marcador de todo lo que ves</h2>
            <p>Crea una cuenta gratis para guardar títulos, calificarlos del 1 al 10 y recibir recomendaciones según tu gusto. Tus datos se quedan en este computador.</p>
            <button className="btn btn--primary btn--lg" onClick={() => openLoginModal()}>Crear una cuenta</button>
          </section>
        )}
      </div>
    </main>
  );
}
