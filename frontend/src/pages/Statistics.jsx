import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MonthlyColumns, GenreBars, StatusBar, ChartTable, STATUS_ORDER, monthLabel } from '../components/StatsChart';
import ScoreBug from '../components/ScoreBug';
import CinephileProfile from '../components/CinephileProfile';
import GuestPrompt from '../components/GuestPrompt';
import { PageError } from '../components/PageLoading';
import { useAuth } from '../context/AuthContext';
import { StatTicker, trendOf } from '../components/Ticker';
import { genreLabel } from '../utils/genres';

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
    <div className="stats" aria-busy="true" aria-label="Cargando estadísticas">
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
        <h1 className="page__heading">Estadísticas</h1>
        <GuestPrompt title="Aquí viven tus estadísticas" message="Inicia sesión para ver tus géneros, tu actividad mensual y las horas que has visto." />
      </main>
    );
  }

  const o = overview;
  const t = o?.trends ?? {};
  const activeMonths = o?.monthlyActivity.filter((m) => m.n > 0).length ?? 0;
  const genreData = (o?.genreDistribution ?? []).map((g) => ({ ...g, genre: genreLabel(g.genre) }));

  return (
    <main className="page statistics">
      <header className="page__header">
        <h1 className="page__heading">Estadísticas</h1>
        {o && o.totals.titles > 0 && (
          <Link className="btn btn--primary statistics__year" to="/year">Tu {new Date().getFullYear()} en cine</Link>
        )}
      </header>

      {error && <PageError message={`No se pudieron cargar las estadísticas: ${error}`} onRetry={() => setReloadKey((k) => k + 1)} />}
      {!error && loading && <StatisticsSkeleton />}

      {!error && !loading && o && o.totals.titles === 0 && (
        <div className="catalog__empty" role="status">
          <h2 className="catalog__empty-title">Aún no hay números</h2>
          <p>Agrega títulos, marca lo que terminas y califícalo. Aquí aparecerán tus géneros, horas y actividad mensual.</p>
          <Link className="btn btn--primary btn--lg" to="/catalog">Ir al catálogo</Link>
        </div>
      )}

      {!error && !loading && o && o.totals.titles > 0 && (
        <motion.div className="stats" initial="hidden" animate="visible">
          <motion.div variants={panelVariants} custom={0}>
            <StatTicker
              standalone
              tag="Tus números"
              sub="± vs. el mes pasado"
              label="Lo que has visto, en números"
              items={[
                { label: 'Títulos',          value: o.totals.titles, trend: trendOf(t.titlesAdded) },
                { label: 'Completados',      value: o.totals.completed, trend: trendOf(t.completed) },
                { label: 'Horas',            value: o.totalHours, decimals: o.totalHours % 1 ? 1 : 0, trend: trendOf(t.hours, 1) },
                { label: 'Tasa de finalización', value: o.completionRate, decimals: o.completionRate % 1 ? 1 : 0, suffix: '%' },
                { label: 'Nota media',       value: o.averageRating, decimals: 1 },
              ]}
            />
            <p className="stats__caption">
              {o.totals.movies} {o.totals.movies === 1 ? 'película' : 'películas'} y {o.totals.series} {o.totals.series === 1 ? 'serie' : 'series'} · la tasa de finalización cuenta los títulos terminados entre todos los que empezaste · nota media de {o.ratedCount} {o.ratedCount === 1 ? 'título calificado' : 'títulos calificados'}.
            </p>
          </motion.div>

          <motion.div variants={panelVariants} custom={1}>
            <CinephileProfile />
          </motion.div>

          <div className="panels">
            <Panel index={1} wide title="Actividad mensual" sub={`Visualizaciones completadas · ${activeMonths} ${activeMonths === 1 ? 'mes activo' : 'meses activos'} en los últimos 12 meses`}>
              <MonthlyColumns data={o.monthlyActivity} />
              <ChartTable
                caption="Visualizaciones completadas por mes"
                columns={['Mes', 'Completadas']}
                rows={o.monthlyActivity.map((m) => [monthLabel(m.month, true), m.n])}
              />
            </Panel>

            <Panel index={2} title="Tus títulos por estado" sub={`${o.totals.titles} en total`}>
              <StatusBar totals={o.totals} />
              <ChartTable
                caption="Títulos por estado"
                columns={['Estado', 'Títulos']}
                rows={STATUS_ORDER.map((s) => [s.label, o.totals[s.key] ?? 0])}
              />
            </Panel>

            <Panel index={3} title="Géneros mejor calificados" sub="Nota media, géneros con 2 o más títulos calificados">
              {o.topRatedGenres.length === 0 ? (
                <p className="panel__empty">Califica al menos dos títulos del mismo género para ver esta clasificación.</p>
              ) : (
                <ol className="ranking">
                  {o.topRatedGenres.map((g, i) => (
                    <li key={g.genre} className="ranking__item">
                      <span className="ranking__pos">{i + 1}</span>
                      <span className="ranking__name">{genreLabel(g.genre)}</span>
                      <span className="ranking__count">{g.n} {g.n === 1 ? 'calificado' : 'calificados'}</span>
                      <ScoreBug value={g.avgRating} readonly size="sm" />
                    </li>
                  ))}
                </ol>
              )}
            </Panel>

            <Panel index={4} wide title="Títulos por género" sub={`Top ${genreData.length}`}>
              {genreData.length === 0 ? (
                <p className="panel__empty">Los títulos agregados desde TMDB traen sus géneros. A los que agregues a mano, ponles géneros tú.</p>
              ) : (
                <>
                  <GenreBars data={genreData} />
                  <ChartTable
                    caption="Títulos por género"
                    columns={['Género', 'Títulos']}
                    rows={genreData.map((g) => [g.genre, g.n])}
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
