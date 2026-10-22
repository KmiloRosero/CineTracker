import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { MonthlyColumns, GenreBars, ChartTable, monthLabel } from '../components/StatsChart';
import { StatTicker } from '../components/Ticker';
import ScoreBug from '../components/ScoreBug';
import GuestPrompt from '../components/GuestPrompt';
import { PageLoading, PageError } from '../components/PageLoading';
import { IconSpinner } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { aiName, fallbackNote, unwrap } from '../utils/ai';
import { formatDate } from '../utils/labels';

const EASE = [0.16, 1, 0.3, 1];

const panelVariants = {
  hidden:  { opacity: 0, y: 12 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE, delay: 0.2 + i * 0.06 } }),
};

function Panel({ title, sub, index, wide = false, children }) {
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

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

function sqlDate(at) {
  return formatDate(String(at).includes('T') ? at : `${String(at).replace(' ', 'T')}Z`);
}

/** "Tu año en cine": the year in review, one season recap per year. */
export default function YearInReview() {
  const { year: yearParam } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState(null);

  async function load({ refresh = false } = {}) {
    if (refresh) setBusy(true); else setLoading(true);
    setError(null);
    try {
      setData(unwrap(await window.electronAPI.getYearInReview(yearParam ? Number(yearParam) : undefined, { refresh })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setBusy(false);
    }
  }

  useEffect(() => {
    if (user) load();
    else setLoading(false);
  }, [user, yearParam]);

  if (!user) {
    return (
      <main className="page">
        <h1 className="page__heading">Tu año en cine</h1>
        <GuestPrompt title="Tu año, en un resumen" message="Inicia sesión para ver lo que viste este año: horas, géneros, lo mejor y lo peor." />
      </main>
    );
  }
  if (loading && !data) return <PageLoading message="Armando tu año…" />;
  if (error && !data) return <PageError message={`No se pudo armar tu año: ${error}`} onRetry={() => load()} />;
  if (!data) return null;

  const s = data.stats;
  const note = fallbackNote(data, 'El resumen se escribió con tus números.');
  const years = data.years ?? [data.year];

  return (
    <main className="page year-review">
      <Link to="/statistics" className="back-link">Estadísticas</Link>

      <section className="year-hero" aria-labelledby="year-heading">
        <div className="year-hero__top">
          <div className="lower-third">
            <span className="lower-third__label"><span>Tu año en cine</span></span>
            <span className="lower-third__meta">
              <span>{data.reason === 'ok' ? (data.source === 'ai' ? `Escrito por ${aiName(data)}` : 'Con tus números') : 'Sin funciones'}</span>
            </span>
          </div>
          {years.length > 1 && (
            <div className="segmented segmented--onair" role="radiogroup" aria-label="Año">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  role="radio"
                  aria-checked={y === data.year}
                  className={`segmented__option${y === data.year ? ' is-active' : ''}`}
                  onClick={() => navigate(`/year/${y}`, { replace: true })}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>

        <motion.h1
          id="year-heading"
          key={data.year}
          className="year-hero__year"
          initial={reduceMotion ? { opacity: 0 } : { clipPath: 'inset(0 100% 0 0)' }}
          animate={reduceMotion ? { opacity: 1 } : { clipPath: 'inset(0 0% 0 0)', transition: { duration: 0.6, ease: EASE } }}
        >
          {data.year}
        </motion.h1>

        {data.reason === 'empty' ? (
          <p className="year-hero__story">Aún no registraste nada visto en {data.year}. Usa “Marcar como visto” en un título y tu año empezará a llenarse.</p>
        ) : (
          <>
            <h2 className="year-hero__headline">{data.headline}</h2>
            <p className="year-hero__story">{data.story}</p>
            <div className="year-hero__actions">
              <button className="btn btn--ghost btn--sm" onClick={() => load({ refresh: true })} disabled={busy}>
                {busy && <IconSpinner />}
                {busy ? 'Reescribiendo…' : 'Reescribir resumen'}
              </button>
              {note && <span className="year-hero__note">{note}</span>}
            </div>
          </>
        )}
      </section>

      {data.reason === 'ok' && (
        <motion.div className="stats" initial="hidden" animate="visible">
          <motion.div variants={panelVariants} custom={0}>
            <StatTicker
              standalone
              tag={String(data.year)}
              label={`Tu ${data.year} en números`}
              items={[
                { label: 'Títulos',   value: s.titles },
                { label: 'Horas',     value: s.hours, decimals: s.hours % 1 ? 1 : 0 },
                { label: 'Películas', value: s.movies },
                { label: 'Series',    value: s.series },
                { label: 'Nota media', value: s.averageRating, decimals: 1 },
              ]}
            />
          </motion.div>

          <div className="panels">
            <Panel index={1} wide title="Mes a mes" sub={s.busiestMonth ? `Tu mes más intenso fue ${s.busiestMonth.label}, con ${plural(s.busiestMonth.n, 'visualización', 'visualizaciones')}` : undefined}>
              <MonthlyColumns data={s.months} />
              <ChartTable caption="Visualizaciones por mes" columns={['Mes', 'Vistas']} rows={s.months.map((m) => [monthLabel(m.month, true), m.n])} />
            </Panel>

            <Panel index={2} title="Lo mejor del año" sub={s.best.length ? 'Tus notas más altas' : undefined}>
              {s.best.length === 0 ? (
                <p className="panel__empty">Califica lo que ves y aquí aparecerá tu podio del año.</p>
              ) : (
                <ol className="ranking">
                  {s.best.map((t, i) => (
                    <li key={t.id} className="ranking__item">
                      <span className="ranking__pos">{i + 1}</span>
                      <Link className="ranking__name year-review__title-link" to={`/title/${t.id}`}>{t.title}</Link>
                      <span className="ranking__count">{t.release_year ?? ''}</span>
                      <ScoreBug value={t.rating} readonly size="sm" />
                    </li>
                  ))}
                </ol>
              )}
              {s.worst && <p className="year-review__worst">Y la que menos te gustó: <strong>{s.worst.title}</strong>, con {s.worst.rating}.</p>}
            </Panel>

            <Panel index={3} title="Premios del año" sub={data.source === 'ai' ? `Entregados por ${aiName(data)}` : undefined}>
              {data.awards.length === 0 ? (
                <p className="panel__empty">Este año aún no hay premios que entregar.</p>
              ) : (
                <ul className="awards">
                  {data.awards.map((a) => (
                    <li key={a.award} className="awards__item">
                      <span className="awards__name">{a.award}</span>
                      <span className="awards__title">{a.title}</span>
                      <span className="awards__why">{a.why}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel index={4} title="Datos curiosos">
              <dl className="facts">
                {s.favouriteWeekday && <><dt>Tu noche de cine</dt><dd>{s.favouriteWeekday.label} · {plural(s.favouriteWeekday.n, 'vez', 'veces')}</dd></>}
                <dt>Racha más larga</dt><dd>{plural(s.longestWeekStreak, 'semana seguida', 'semanas seguidas')}</dd>
                <dt>Semanas con algo visto</dt><dd>{s.activeWeeks} de 52</dd>
                {s.decade && <><dt>Década favorita</dt><dd>Los {s.decade}</dd></>}
                {s.first && <><dt>Abriste el año con</dt><dd>{s.first.title} · {sqlDate(s.first.at)}</dd></>}
                {s.last && s.last.id !== s.first?.id && <><dt>Lo último</dt><dd>{s.last.title} · {sqlDate(s.last.at)}</dd></>}
                {s.rewatched.length > 0 && <><dt>Repetiste</dt><dd>{s.rewatched.map((t) => `${t.title} (${t.times})`).join(', ')}</dd></>}
                {s.episodes > 0 && <><dt>Episodios marcados</dt><dd>{s.episodes}</dd></>}
                <dt>Agregados al catálogo</dt><dd>{s.added}</dd>
              </dl>
            </Panel>

            <Panel index={5} title="Géneros del año" sub={s.topGenres[0] ? `Ganó ${s.topGenres[0].label.toLowerCase()}` : undefined}>
              {s.topGenres.length === 0 ? (
                <p className="panel__empty">Los títulos de TMDB traen sus géneros; a los manuales ponles géneros tú.</p>
              ) : (
                <>
                  <GenreBars data={s.topGenres.map((g) => ({ genre: g.label, n: g.n }))} />
                  <ChartTable caption="Títulos por género en el año" columns={['Género', 'Títulos']} rows={s.topGenres.map((g) => [g.label, g.n])} />
                </>
              )}
            </Panel>
          </div>
        </motion.div>
      )}
    </main>
  );
}
