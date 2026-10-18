import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MonthlyColumns, GenreBars, StatusBar, ChartTable, STATUS_ORDER, monthLabel } from '../components/StatsChart';
import ScoreBug from '../components/ScoreBug';
import GuestPrompt from '../components/GuestPrompt';
import { PageError } from '../components/PageLoading';
import { useAuth } from '../context/AuthContext';
import { StatTicker, trendOf } from '../components/Ticker';

function unwrap(result) {
  if (result?.error) throw new Error(result.error);
  return result;
}

const panelVariants = {
  hidden:  { opacity: 0, y: 12 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 } }),
};

function Panel({ title, sub, index, children, wide = false }) {
  return (
    <motion.section className={`panel${wide ? ' panel--wide' : ''}`} variants={panelVariants} custom={index} aria-label={title}>
      <header className="panel__header">
        <h2 className="panel__title">{title}</h2>
        {sub && <span className="panel__sub">{sub}</span>}
      </header>
      {children}
    </motion.section>
  );
}

function StatisticsSkeleton() {
  return (
    <div className="stats" aria-busy="true" aria-label="Loading statistics">
      <div className="ticker ticker--standalone skeleton" />
      <div className="panels">
        <div className="panel panel--wide skeleton panel--skeleton" />
        <div className="panel skeleton panel--skeleton" />
        <div className="panel skeleton panel--skeleton" />
      </div>
    </div>
  );
}

export default function Statistics() {
  const { user } = useAuth();
  const [overview,  setOverview]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) { setLoading(false); setOverview(null); return undefined; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    window.electronAPI.getStatsOverview()
      .then((o) => { if (!cancelled) setOverview(unwrap(o)); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, reloadKey]);

  if (!user) {
    return (
      <main className="page">
        <h1 className="page__heading">Statistics</h1>
        <GuestPrompt title="Your viewing stats live here" message="Log in to see your genres, monthly activity and hours watched." />
      </main>
    );
  }

  const o = overview;
  const t = o?.trends ?? {};
  const activeMonths = o?.monthlyActivity.filter((m) => m.n > 0).length ?? 0;

  return (
    <main className="page statistics">
      <header className="page__header">
        <h1 className="page__heading">Statistics</h1>
      </header>

      {error && <PageError message={`Failed to load statistics: ${error}`} onRetry={() => setReloadKey((k) => k + 1)} />}
      {!error && loading && <StatisticsSkeleton />}

      {!error && !loading && o && o.totals.titles === 0 && (
        <div className="catalog__empty" role="status">
          <h2 className="catalog__empty-title">No numbers yet</h2>
          <p>Add titles, mark what you finish and rate them. Your genres, hours and monthly activity appear here.</p>
          <Link className="btn btn--primary btn--lg" to="/catalog">Go to catalog</Link>
        </div>
      )}

      {!error && !loading && o && o.totals.titles > 0 && (
        <motion.div className="stats" initial="hidden" animate="visible">
          <motion.div variants={panelVariants} custom={0}>
            <StatTicker
              standalone
              tag="Your numbers"
              sub="± vs last month"
              label="Your viewing in numbers"
              items={[
                { label: 'Titles',          value: o.totals.titles, trend: trendOf(t.titlesAdded) },
                { label: 'Completed',       value: o.totals.completed, trend: trendOf(t.completed) },
                { label: 'Hours',           value: o.totalHours, decimals: o.totalHours % 1 ? 1 : 0, trend: trendOf(t.hours, 1) },
                { label: 'Completion rate', value: o.completionRate, decimals: o.completionRate % 1 ? 1 : 0, suffix: '%' },
                { label: 'Avg score',       value: o.averageRating, decimals: 1 },
              ]}
            />
            <p className="stats__caption">
              {o.totals.movies} movies and {o.totals.series} series · completion rate counts finished titles out of every title you started · average score from {o.ratedCount} rated {o.ratedCount === 1 ? 'title' : 'titles'}.
            </p>
          </motion.div>

          <div className="panels">
            <Panel index={1} wide title="Monthly activity" sub={`Completed watches · ${activeMonths} active ${activeMonths === 1 ? 'month' : 'months'} in the last 12 months`}>
              <MonthlyColumns data={o.monthlyActivity} />
              <ChartTable
                caption="Completed watches per month"
                columns={['Month', 'Completed']}
                rows={o.monthlyActivity.map((m) => [monthLabel(m.month, true), m.n])}
              />
            </Panel>

            <Panel index={2} title="Your titles by status" sub={`${o.totals.titles} in total`}>
              <StatusBar totals={o.totals} />
              <ChartTable
                caption="Titles by status"
                columns={['Status', 'Titles']}
                rows={STATUS_ORDER.map((s) => [s.label, o.totals[s.key] ?? 0])}
              />
            </Panel>

            <Panel index={3} title="Top-rated genres" sub="Average score, genres with 2+ rated titles">
              {o.topRatedGenres.length === 0 ? (
                <p className="panel__empty">Rate at least two titles in the same genre to see this ranking.</p>
              ) : (
                <ol className="ranking">
                  {o.topRatedGenres.map((g, i) => (
                    <li key={g.genre} className="ranking__item">
                      <span className="ranking__pos">{i + 1}</span>
                      <span className="ranking__name">{g.genre}</span>
                      <span className="ranking__count">{g.n} rated</span>
                      <ScoreBug value={g.avgRating} readonly size="sm" />
                    </li>
                  ))}
                </ol>
              )}
            </Panel>

            <Panel index={4} wide title="Titles per genre" sub={`Top ${o.genreDistribution.length}`}>
              {o.genreDistribution.length === 0 ? (
                <p className="panel__empty">Titles added from TMDB come with genres. Add genres by hand to manual entries.</p>
              ) : (
                <>
                  <GenreBars data={o.genreDistribution} />
                  <ChartTable
                    caption="Titles per genre"
                    columns={['Genre', 'Titles']}
                    rows={o.genreDistribution.map((g) => [g.genre, g.n])}
                  />
                </>
              )}
            </Panel>
          </div>
        </motion.div>
      )}
    </main>
  );
}
