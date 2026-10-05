import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import TitleCard from '../components/TitleCard';
import { gridVariants } from '../components/cardAnimations';
import { useAuth } from '../context/AuthContext';
import { PageLoading, PageError } from '../components/PageLoading';

const NO_REC_MSG = {
  'no-ratings': 'Rate completed titles 8 or higher to unlock recommendations.',
  'no-pending':  'Add titles with "Pending" status to start getting suggestions.',
  'no-match':    'No pending titles match your top-rated genres yet. Keep rating.',
};

// ── Icon components — drawn SVGs, no emoji ────────────────────────────────
function IconFilm() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/>
    </svg>
  );
}
function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
function IconStar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}
function IconSparkle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.64 5.64l2.12 2.12M16.24 16.24l2.12 2.12M16.24 7.76l-2.12 2.12M7.76 16.24l-2.12 2.12"/>
    </svg>
  );
}
function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

// ── StatPill ──────────────────────────────────────────────────────────────
function StatPill({ label, value, icon: Icon, accent = false }) {
  return (
    <div className={`stat-pill${accent ? ' stat-pill--accent' : ''}`}>
      <span className="stat-pill__icon"><Icon /></span>
      <span className="stat-pill__value">{value}</span>
      <span className="stat-pill__label">{label}</span>
    </div>
  );
}

// ── Home ──────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [titles,  setTitles]  = useState([]);
  const [stats,   setStats]   = useState(null);
  const [rec,     setRec]     = useState({ recommendations: [], reason: 'no-ratings' });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // ── data fetching — untouched ─────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [allTitles, recResult] = await Promise.all([          window.electronAPI.getAllTitles({}),
          window.electronAPI.getRecommendations(),
        ]);
        setTitles(allTitles);
        setRec(recResult ?? { recommendations: [], reason: 'no-ratings' });

        const completed = allTitles.filter((t) => t.status === 'completed').length;
        const watching  = allTitles.filter((t) => t.status === 'watching').length;
        const pending   = allTitles.filter((t) => t.status === 'pending').length;
        const ratings   = allTitles.map((t) => t.rating).filter((r) => r != null);
        const avgRating = ratings.length
          ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
          : null;
        setStats({ total: allTitles.length, completed, watching, pending, avgRating });
      } catch (err) {
        setError(err.message);
        console.error('Home load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const recent = useMemo(() => titles.slice(0, 6), [titles]);
  const { recommendations, reason } = rec;

  const greeting = user
    ? `Good ${getTimeOfDay()}, ${user.name.split(' ')[0]}`
    : 'Your collection';

  if (loading) return <PageLoading />;
  if (error)   return <PageError message={`Failed to load: ${error}`} onRetry={() => { setLoading(true); setError(null); }} />;
  return (
    <main className="page">

      {/* ── page heading ── */}
      <div className="home__header">
        <h1 className="page__heading">{greeting}</h1>
        {stats && (
          <p className="home__header-sub">
            {stats.total === 0
              ? 'No titles yet — add your first one below.'
              : `${stats.total} title${stats.total !== 1 ? 's' : ''} · ${stats.completed} completed`}
          </p>
        )}
      </div>

      {/* ── stat strip ── */}
      {stats && (
        <motion.div
          className="home__stat-strip"
          aria-label="Collection summary"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } }}
        >
          <StatPill label="Total"     value={stats.total}     icon={IconFilm}  accent />
          <StatPill label="Watching"  value={stats.watching}  icon={IconPlay} />
          <StatPill label="Completed" value={stats.completed} icon={IconCheck} />
          <StatPill label="Pending"   value={stats.pending}   icon={IconClock} />
          {stats.avgRating && (
            <StatPill label="Avg Rating" value={`${stats.avgRating}/10`} icon={IconStar} />
          )}
        </motion.div>
      )}

      {/* ── recommendations — primary section ── */}
      <section className="home__section" aria-label="Recommended for you">
        <div className="section-header section-header--primary">
          <div className="section-header__left">
            <h2>Recommended for You</h2>
            {recommendations.length > 0 && (
              <span className="section-header__sub">
                Based on your highest-rated genres
              </span>
            )}
          </div>
        </div>

        {recommendations.length > 0 ? (
          <motion.div className="title-grid" variants={gridVariants} initial="hidden" animate="visible">
            {recommendations.map((t) => (
              <TitleCard key={t.id} title={t} onClick={(id) => navigate(`/title/${id}`)} />
            ))}
          </motion.div>
        ) : (
          <div className="home__empty" role="status">
            <div className="home__empty__icon-wrap"><IconSparkle /></div>
            <p>{NO_REC_MSG[reason] ?? 'No recommendations available yet.'}</p>
          </div>
        )}
      </section>

      {/* ── recently added — secondary section ── */}
      <section className="home__section" aria-label="Recently added">
        <div className="section-header">
          <div className="section-header__left">
            <h2>Recently Added</h2>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={() => navigate('/catalog')}>
            View all
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="home__empty" role="status">
            <div className="home__empty__icon-wrap"><IconPlus /></div>
            <p>No titles yet.</p>
            <button className="btn btn--primary" onClick={() => navigate('/catalog')}>
              Add your first title
            </button>
          </div>
        ) : (
          <motion.div className="title-grid" variants={gridVariants} initial="hidden" animate="visible">
            {recent.map((t) => (
              <TitleCard key={t.id} title={t} onClick={(id) => navigate(`/title/${id}`)} />
            ))}
          </motion.div>
        )}
      </section>

    </main>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────
function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
