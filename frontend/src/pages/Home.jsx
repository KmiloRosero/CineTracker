import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import FixtureCard from '../components/FixtureCard';
import { gridVariants } from '../components/cardAnimations';
import { PageError } from '../components/PageLoading';
import { useAuth } from '../context/AuthContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useCountUp } from '../hooks/useCountUp';
import { getTrending, getTitleDetails, toCatalogPayload } from '../services/tmdbApi';
import { parseGenres } from '../utils/genres';
import { tmdbImage } from '../utils/tmdbImage';

const NO_REC_MSG = {
  'no-ratings': 'Rate completed titles 8 or higher to unlock recommendations.',
  'no-pending': 'Add titles as Pending to get suggestions from your own list.',
  'no-match':   'None of your pending titles match your top-rated genres yet. Keep rating.',
};

const FEATURED_COUNT = 4;
const ROTATE_MS      = 9000;
const EASE           = [0.16, 1, 0.3, 1];

function unwrap(result) {
  if (result?.error) throw new Error(result.error);
  return result;
}

// ── Icons ─────────────────────────────────────────────────────────────────
function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" aria-hidden="true">
      <line x1="4" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/>
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function IconSpinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" style={{ animation: 'spin 1s linear infinite' }}>
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
    genres: parseGenres(t.genres),
    label,
    localId: t.id,
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
    label: `Trending #${rank}`,
    localId: catalogId ?? null,
    tmdbItem: item,
  };
}

// ── Ticker (broadcast stats strip) ───────────────────────────────────────
function trendOf(pair, decimals = 0) {
  if (!pair || pair.current == null || pair.previous == null) return null;
  const diff = Number((pair.current - pair.previous).toFixed(decimals));
  return diff === 0 ? null : diff;
}

function TickerStat({ label, value, decimals = 0, suffix = '', trend }) {
  const shown = useCountUp(value ?? 0, { decimals });
  return (
    <div className="ticker__stat">
      <span className="ticker__value">{value == null ? '–' : `${shown}${suffix}`}</span>
      <span className="ticker__label">{label}</span>
      {trend != null && trend !== 0 && (
        <span
          className={`ticker__trend ${trend > 0 ? 'is-up' : 'is-down'}`}
          title={`${Math.abs(trend)} ${trend > 0 ? 'more' : 'less'} than last month`}
        >
          {trend > 0 ? `+${trend}` : trend}
          <span className="sr-only"> vs last month</span>
        </span>
      )}
    </div>
  );
}

function Ticker({ overview, trending }) {
  if (overview) {
    const t = overview.trends ?? {};
    const hourDecimals = overview.totalHours % 1 ? 1 : 0;
    return (
      <div className="ticker" aria-label="Your catalog in numbers">
        <span className="ticker__tag">Your catalog<small>± vs last month</small></span>
        <div className="ticker__stats">
          <TickerStat label="Titles"    value={overview.totals.titles}    trend={trendOf(t.titlesAdded)} />
          {/* status changes are not dated, so "watching" has no monthly trend either */}
          <TickerStat label="Watching"  value={overview.totals.watching} />
          <TickerStat label="Completed" value={overview.totals.completed} trend={trendOf(t.completed)} />
          <TickerStat label="Hours"     value={overview.totalHours}       decimals={hourDecimals} trend={trendOf(t.hours, 1)} />
          {/* catalogue average has no dated history; a watch-average delta here would mislead */}
          <TickerStat label="Avg score" value={overview.averageRating}    decimals={1} />
        </div>
      </div>
    );
  }
  if (trending.length > 0) {
    const names = trending.map((t) => t.title);
    return (
      <div className="ticker" aria-label="Trending this week">
        <span className="ticker__tag">Trending</span>
        <div className="ticker__crawl" aria-hidden="true">
          {/* two copies make the crawl loop seamlessly */}
          <div className="ticker__crawl-track">
            {[...names, ...names].map((name, i) => <span key={i}>{name}</span>)}
          </div>
        </div>
        <p className="sr-only">{names.join(', ')}</p>
      </div>
    );
  }
  return null;
}

// ── Stage (first viewport) ────────────────────────────────────────────────
function Stage({ featured, onPrimary, primaryState, user, onLogin, onBrowse, children }) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const keys = featured.map((f) => f.key).join('|');

  useEffect(() => { setActive(0); }, [keys]);

  useEffect(() => {
    if (reduceMotion || paused || featured.length < 2) return undefined;
    const id = setInterval(() => setActive((i) => (i + 1) % featured.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [reduceMotion, paused, featured.length]);

  const current = featured[active];
  if (!current) return null;

  // the deck shows the next titles in order, so the lineup reads left to right
  const deck = featured.map((_, i) => featured[(active + 1 + i) % featured.length]).slice(0, featured.length - 1);
  const meta = [
    current.year,
    current.runtime ? `${current.runtime} min` : null,
    current.type === 'movie' ? 'Movie' : 'Series',
    current.genres.slice(0, 2).join(' / ') || null,
  ].filter(Boolean);
  const backdrop = tmdbImage(current.backdrop, 'w1280') ?? tmdbImage(current.poster, 'w780');
  const { label: actionLabel, icon: actionIcon, busy } = primaryState(current);

  return (
    <section
      className="stage"
      aria-roledescription="carousel"
      aria-label="Featured titles"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="stage__backdrop" aria-hidden="true">
        <AnimatePresence initial={false}>
          {backdrop && (
            <motion.img
              key={current.key}
              src={backdrop}
              alt=""
              initial={{ opacity: 0, scale: reduceMotion ? 1 : 1.06 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 1.6, ease: EASE } }}
              exit={{ opacity: 0, transition: { duration: 1.2, ease: 'easeInOut' } }}
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

        <div className="stage__actions">
          <button className="btn btn--primary btn--lg" onClick={() => onPrimary(current)} disabled={busy}>
            {busy ? <IconSpinner /> : actionIcon}
            {actionLabel}
          </button>
          {user
            ? <button className="btn btn--ghost btn--lg stage__ghost" onClick={onBrowse}>Browse catalog</button>
            : <button className="btn btn--ghost btn--lg stage__ghost" onClick={onLogin}>Log in</button>}
        </div>

        {featured.length > 1 && (
          <div className="stage__dots" role="tablist" aria-label="Choose featured title">
            {featured.map((f, i) => (
              <button
                key={f.key}
                role="tab"
                aria-selected={i === active}
                aria-label={f.title}
                className={`stage__dot${i === active ? ' is-active' : ''}`}
                onClick={() => setActive(i)}
              />
            ))}
          </div>
        )}
      </div>

      {deck.length > 0 && (
        <div className="stage__deck" role="group" aria-label="Up next">
          {deck.map((f, slot) => (
            <motion.button
              key={f.key}
              layout={!reduceMotion}
              type="button"
              className={`stage__card stage__card--${slot}`}
              onClick={() => setActive(featured.indexOf(f))}
              aria-label={`Feature ${f.title}`}
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
    <section className="stage stage--loading" aria-busy="true" aria-label="Loading featured titles">
      <div className="stage__copy">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--bar" />
        <div className="skeleton skeleton--line" />
      </div>
    </section>
  );
}

// ── Rails (rows below the stage) ──────────────────────────────────────────
function Rail({ title, sub, action, children, empty }) {
  return (
    <section className="rail" aria-label={title}>
      <header className="rail__header">
        <h2 className="rail__title">{title}</h2>
        {sub && <span className="rail__tag">{sub}</span>}
        {action && <div className="rail__action">{action}</div>}
      </header>
      {empty ?? (
        <motion.div className="fixture-grid" variants={gridVariants} initial="hidden" animate="visible">
          {children}
        </motion.div>
      )}
    </section>
  );
}

function RailEmpty({ children }) {
  return <div className="rail__empty" role="status">{children}</div>;
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

  const [trending,        setTrending]        = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingError,   setTrendingError]   = useState(null);
  const [addingTmdbId,    setAddingTmdbId]    = useState(null);
  const [addError,        setAddError]        = useState(null);

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
  useEffect(() => {
    if (!user || loading) return;
    setRecsLoading(true);
    window.electronAPI.getAIRecommendations()
      .then((result) => setRecs(unwrap(result) ?? { recommendations: [], reason: 'no-ratings' }))
      .catch(() => setRecs({ recommendations: [], reason: 'no-ratings', source: 'rule-based' }))
      .finally(() => setRecsLoading(false));
  }, [user, loading]);

  // ── TMDB trending (public) ────────────────────────────────────────────
  useEffect(() => {
    getTrending()
      .then(setTrending)
      .catch((err) => setTrendingError(err.message))
      .finally(() => setTrendingLoading(false));
  }, []);

  const catalogByTmdbId = useMemo(() => {
    const map = new Map();
    titles.forEach((t) => { if (t.tmdb_id != null) map.set(t.tmdb_id, t.id); });
    return map;
  }, [titles]);

  const watching        = useMemo(() => titles.filter((t) => t.status === 'watching'), [titles]);
  const recommendations = useMemo(() => recs?.recommendations ?? [], [recs]);
  const recent          = titles.slice(0, 6);

  // Featured lineup: your own titles when you have them, otherwise trending.
  const featured = useMemo(() => {
    if (user && titles.length > 0) {
      const seen = new Set();
      const lineup = [
        ...watching.map((t) => fromLocal(t, 'Now watching')),
        ...recommendations.map((t) => fromLocal(t, 'Pick for you')),
        ...titles.map((t) => fromLocal(t, 'Just added')),
      ].filter((f) => {
        if (seen.has(f.key) || !(f.backdrop || f.poster)) return false;
        seen.add(f.key);
        return true;
      });
      if (lineup.length > 0) return lineup.slice(0, FEATURED_COUNT);
    }
    return trending
      .filter((t) => t.backdrop_path)
      .slice(0, FEATURED_COUNT)
      .map((t, i) => fromTrending(t, i + 1, catalogByTmdbId.get(t.tmdb_id)));
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
        setAddError(`Could not add "${item.title}": ${err.message}`);
      } finally {
        setAddingTmdbId(null);
      }
    });
  }

  function primaryState(f) {
    if (f.localId) return { label: 'Open title', icon: <IconArrow /> };
    return { label: 'Add to catalog', icon: <IconPlus />, busy: addingTmdbId === f.tmdbItem?.tmdb_id };
  }

  function handlePrimary(f) {
    if (f.localId) navigate(`/title/${f.localId}`);
    else if (f.tmdbItem) handleAddTrending(f.tmdbItem);
  }

  const openTitle  = (id) => navigate(`/title/${id}`);
  const stageReady = !(user ? loading : trendingLoading);

  if (error) {
    return <PageError message={`Failed to load your catalog: ${error}`} onRetry={() => setReloadKey((k) => k + 1)} />;
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
        >
          <Ticker overview={user ? overview : null} trending={trending} />
        </Stage>
      )}
      {stageReady && featured.length === 0 && (
        <section className="stage stage--empty">
          <div className="stage__copy">
            <h1 className="stage__title">Your catalog starts here</h1>
            <p className="stage__overview">
              {trendingError
                ? `Trending titles are unavailable right now (${trendingError}). You can still add titles by hand.`
                : 'Add the first movie or series you are watching.'}
            </p>
            <div className="stage__actions">
              <button className="btn btn--primary btn--lg" onClick={() => requireAuth(() => navigate('/catalog'))}>
                <IconPlus /> Add a title
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="home__rails">
        {addError && <p className="form-error" role="alert">{addError}</p>}

        {user && watching.length > 0 && (
          <Rail title="Continue watching" sub={`${watching.length} in progress`}>
            {watching.slice(0, 6).map((t) => <FixtureCard key={t.id} title={t} onOpen={openTitle} />)}
          </Rail>
        )}

        {user && (
          <Rail
            title="Recommended for you"
            sub={recs?.source === 'ai' ? 'Picked by Claude from your ratings' : 'Based on your highest-rated genres'}
            empty={
              recsLoading ? <RailEmpty>Finding titles that fit your taste…</RailEmpty>
              : recommendations.length === 0 ? <RailEmpty>{NO_REC_MSG[recs?.reason] ?? 'No recommendations yet.'}</RailEmpty>
              : undefined
            }
          >
            {recommendations.map((t) => <FixtureCard key={t.id} title={t} reason={t.ai_reason} onOpen={openTitle} />)}
          </Rail>
        )}

        <Rail
          title="Trending this week"
          sub="From TMDB"
          empty={
            trendingLoading ? <RailEmpty>Loading trending titles…</RailEmpty>
            : trendingError ? <RailEmpty>Trending titles are unavailable right now. {trendingError}</RailEmpty>
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
            title="Recently added"
            action={titles.length > 0 && <button className="btn btn--ghost btn--sm" onClick={() => navigate('/catalog')}>View all</button>}
            empty={titles.length === 0
              ? <RailEmpty>Nothing here yet. Add a title from Trending or the Catalog.</RailEmpty>
              : undefined}
          >
            {recent.map((t) => <FixtureCard key={t.id} title={t} onOpen={openTitle} />)}
          </Rail>
        )}

        {!user && (
          <section className="home__signup">
            <h2 className="home__signup-title">Keep score of everything you watch</h2>
            <p>Make a free account to save titles, rate them from 1 to 10 and get picks based on your taste. Your data stays on this computer.</p>
            <button className="btn btn--primary btn--lg" onClick={() => openLoginModal()}>Create an account</button>
          </section>
        )}
      </div>
    </main>
  );
}
