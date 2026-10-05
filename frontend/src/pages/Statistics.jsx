import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChartCard, LineChartCard } from '../components/StatsChart';
import { PageLoading, PageError } from '../components/PageLoading';

// ── helpers — untouched ───────────────────────────────────────────────────
function parseGenres(raw) {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

// ── animation variants — untouched ───────────────────────────────────────
const cardVariants = {
  hidden:  { opacity: 0, y: 8 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.2, delay: i * 0.06 } }),
};

// ── SVG icons — drawn, no emoji ───────────────────────────────────────────
function IconFilm() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2"/>
      <line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
function IconStar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}
function IconTag() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  );
}
function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
    </svg>
  );
}
function IconBarChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}

// rank medal colours — semantic, not decorative
const RANK_CLASS = ['gold', 'silver', 'bronze'];

// ── Statistics ────────────────────────────────────────────────────────────
export default function Statistics() {
  // ── state — untouched ──────────────────────────────────────────────────
  const [titles,  setTitles]  = useState([]);
  const [genres,  setGenres]  = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [hours,   setHours]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // ── data fetching — untouched ──────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true); setError(null);
      try {
        const [allTitles, genreCounts, monthlyWatched, totalHours] = await Promise.all([
          window.electronAPI.getAllTitles({}),
          window.electronAPI.getGenreCounts(),
          window.electronAPI.getMonthlyWatched(),
          window.electronAPI.getTotalHours(),
        ]);
        setTitles(allTitles);
        setGenres(genreCounts ?? []);
        setMonthly(monthlyWatched ?? []);
        setHours(totalHours?.totalHours ?? 0);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── derived — untouched ────────────────────────────────────────────────
  const summary = useMemo(() => {
    const completed = titles.filter((t) => t.status === 'completed').length;
    const watching  = titles.filter((t) => t.status === 'watching').length;
    const ratings   = titles.map((t) => t.rating).filter((r) => r != null);
    const avgRating = ratings.length
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : null;
    return { total: titles.length, completed, watching, avgRating };
  }, [titles]);

  const topGenre = useMemo(() => genres[0]?.genre ?? null, [genres]);

  const genreChartData   = useMemo(() => genres.map((g) => ({ name: g.genre, value: g.n })),  [genres]);
  const monthlyChartData = useMemo(() => monthly.map((m) => ({ name: m.month, value: m.n })), [monthly]);

  const topGenresByRating = useMemo(() => {
    const map = {};
    titles.forEach((t) => {
      if (t.rating == null) return;
      parseGenres(t.genres).forEach((g) => {
        if (!map[g]) map[g] = { sum: 0, count: 0 };
        map[g].sum += Number(t.rating);
        map[g].count += 1;
      });
    });
    return Object.entries(map)
      .filter(([, v]) => v.count >= 1)
      .map(([name, v]) => ({ name, avg: +(v.sum / v.count).toFixed(1) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 3);
  }, [titles]);

  // ── loading / error ────────────────────────────────────────────────────
  if (loading) return <PageLoading message="Loading statistics…" />;
  if (error)   return <PageError message={error} onRetry={() => { setLoading(true); setError(null); }} />;

  if (titles.length === 0) {
    return (
      <main className="page">
        <h1 className="page__heading">Statistics</h1>
        <div className="statistics__empty">
          <div className="statistics__empty__icon-wrap"><IconBarChart /></div>
          <p>Add some titles to your catalog to see statistics here.</p>
        </div>
      </main>
    );
  }

  // stat card definitions — icon components, no emoji
  const summaryCards = [
    { Icon: IconFilm,  value: summary.total,            label: 'Total Titles',  mod: 'accent', hero: true },
    { Icon: IconCheck, value: summary.completed,         label: 'Completed',     mod: 'green'  },
    { Icon: IconClock, value: `${hours ?? 0}h`,          label: 'Hours Watched', mod: null      },
    summary.avgRating
      ? { Icon: IconStar, value: summary.avgRating,      label: 'Avg Rating /10', mod: 'gold'  }
      : null,
    topGenre
      ? { Icon: IconTag,  value: topGenre,               label: 'Top Genre',     mod: null, small: true }
      : null,
    { Icon: IconPlay,  value: summary.watching,          label: 'Watching',      mod: null      },
  ].filter(Boolean);

  return (
    <main className="page">
      <h1 className="page__heading">Statistics</h1>

      {/* ── summary cards ── */}
      <div className="stat-grid" aria-label="Summary statistics">
        {summaryCards.map((c, i) => (
          <motion.div
            key={c.label}
            className={[
              'stat-card',
              c.mod   ? `stat-card--${c.mod}` : '',
              c.hero  ? 'stat-card--hero'     : '',
            ].filter(Boolean).join(' ')}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <span className="stat-card__icon"><c.Icon /></span>
            <span className={`stat-card__value${c.small ? ' stat-card__value--sm' : ''}`}>
              {c.value}
            </span>
            <span className="stat-card__label">{c.label}</span>
          </motion.div>
        ))}
      </div>

      {/* ── top genres by avg rating ── */}
      {topGenresByRating.length > 0 && (
        <section className="statistics__top-genres" aria-label="Top genres by average rating">
          <h2 className="statistics__section-label">Top Genres by Avg Rating</h2>
          <div className="top-genres__list">
            {topGenresByRating.map((g, i) => (
              <motion.div
                key={g.name}
                className="top-genres__item"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0, transition: { duration: 0.2, delay: i * 0.07 } }}
              >
                <span className={`top-genres__rank top-genres__rank--${RANK_CLASS[i]}`}>
                  #{i + 1}
                </span>
                <span className="top-genres__name">{g.name}</span>
                <span className="top-genres__avg">
                  <div className="top-genres__avg-bar">
                    <div
                      className="top-genres__avg-fill"
                      style={{ width: `${(g.avg / 10) * 100}%` }}
                    />
                  </div>
                  {g.avg} / 10
                </span>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── charts ── */}
      <div className="statistics__charts">
        <div className="chart-card">
          <h3 className="chart-card__title">Titles per Genre</h3>
          <BarChartCard
            data={genreChartData}
            color="var(--accent)"
          />
        </div>
        <div className="chart-card">
          <h3 className="chart-card__title">Titles Watched per Month</h3>
          <LineChartCard
            data={monthlyChartData}
            color="var(--status-completed)"
          />
        </div>
      </div>
    </main>
  );
}
