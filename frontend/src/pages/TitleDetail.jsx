import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import ScoreBug from '../components/ScoreBug';
import ListMenu from '../components/ListMenu';
import { PageLoading } from '../components/PageLoading';
import { ConfirmDialog } from '../components/Modal';
import { useToast } from '../components/Toast';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { usePosterColor } from '../hooks/usePosterColor';
import { useAuth } from '../context/AuthContext';
import GuestPrompt from '../components/GuestPrompt';
import TrailerModal from '../components/TrailerModal';
import RelatedTitles from '../components/RelatedTitles';
import WatchProviders from '../components/WatchProviders';
import TitleInsight from '../components/TitleInsight';
import EpisodeTracker from '../components/EpisodeTracker';
import { parseGenres, canonicalGenres, genreLabel, genreKey } from '../utils/genres';
import { parseCast } from '../utils/cast';
import { tmdbImage } from '../utils/tmdbImage';
import { STATUS_LABEL, STATUS_OPTIONS, typeLabel, formatDate } from '../utils/labels';


const EMPTY_FORM = {
  title: '', original_title: '', type: 'movie', overview: '',
  release_year: '', runtime: '', status: 'pending', rating: 0,
  notes: '', poster_path: '', genres: '',
};

const EASE = [0.16, 1, 0.3, 1];
const POSTER_TILT = -7;

function unwrap(result) {
  if (result?.error) throw new Error(result.error);
  return result;
}

// ── Icons (one stroke family) ─────────────────────────────────────────────
const svg = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'square', strokeLinejoin: 'miter', 'aria-hidden': true };
const IconBack     = () => <svg {...svg}><line x1="20" y1="12" x2="5" y2="12"/><polyline points="11 6 5 12 11 18"/></svg>;
const IconPrev     = () => <svg {...svg}><polyline points="15 5 8 12 15 19"/></svg>;
const IconNext     = () => <svg {...svg}><polyline points="9 5 16 12 9 19"/></svg>;
const IconEdit     = () => <svg {...svg}><path d="M4 20h4L19 9l-4-4L4 16v4z"/><line x1="13" y1="7" x2="17" y2="11"/></svg>;
const IconList     = () => <svg {...svg}><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="15" y2="18"/><line x1="4" y1="6" x2="5" y2="6"/><line x1="4" y1="12" x2="5" y2="12"/><line x1="4" y1="18" x2="5" y2="18"/><line x1="18" y1="15" x2="18" y2="21"/><line x1="15" y1="18" x2="21" y2="18"/></svg>;
const IconTrash    = () => <svg {...svg}><polyline points="4 7 20 7"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg>;
const IconCheck    = () => <svg {...svg} strokeWidth={2.5}><polyline points="5 12 10 17 19 7"/></svg>;
const IconPlay     = () => <svg {...svg}><polygon points="7 4 20 12 7 20" fill="currentColor"/></svg>;
const IconClose    = () => <svg {...svg}><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>;
const IconSpinner  = () => (
  <svg {...svg} strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
);
const IconFilmLarge = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
  </svg>
);

// ── Showcase: the title "goes to replay" ──────────────────────────────────
function Showcase({ title, records, direction, neighbours, marking, onRate, onStatus, onMarkWatched, onTrailer, onEdit, onDelete, onDeleteRecord, onNavigate, onBack, children }) {
  const reduceMotion = useReducedMotion();
  const [listsOpen, setListsOpen] = useState(false);
  const genres    = canonicalGenres(title.genres).map(genreLabel);
  const cast      = parseCast(title.cast_members).slice(0, 6);
  const posterSrc = tmdbImage(title.poster_path, 'w780');
  const field     = usePosterColor(tmdbImage(title.poster_path, 'w185'));
  const meta = [
    typeLabel(title.type),
    title.release_year,
    title.runtime ? `${title.runtime} min` : null,
  ].filter(Boolean);

  const offset = direction * 80;
  const wipe = (delay) => ({
    hidden:  reduceMotion ? { opacity: 0 } : { scaleX: 0 },
    visible: reduceMotion ? { opacity: 1 } : { scaleX: 1, transition: { duration: 0.28, ease: EASE, delay } },
  });

  return (
    <div className="showcase" style={{ '--field': field }}>
      <div className="showcase__field" aria-hidden="true" />

      <motion.div
        key={title.id}
        className="showcase__stage"
        initial="hidden"
        animate="visible"
      >
        {/* ── left: the caption ── */}
        <div className="showcase__copy">

          <motion.h1
            className="showcase__title"
            variants={{
              hidden:  reduceMotion ? { opacity: 0 } : { clipPath: 'inset(0 100% 0 0)' },
              visible: reduceMotion ? { opacity: 1 } : { clipPath: 'inset(0 0% 0 0)', transition: { duration: 0.55, ease: EASE, delay: 0.05 } },
            }}
          >
            {title.title}
          </motion.h1>
          {title.original_title && title.original_title !== title.title && (
            <p className="showcase__original">{title.original_title}</p>
          )}

          <div className="lower-third">
            <motion.span className={`lower-third__label status-slab status-slab--${title.status}`} variants={wipe(0.4)}>
              <span>{STATUS_LABEL[title.status] ?? title.status}</span>
            </motion.span>
            <motion.span className="lower-third__meta" variants={wipe(0.48)}>
              <span>{meta.join(' · ')}</span>
            </motion.span>
          </div>

          {genres.length > 0 && (
            <ul className="showcase__genres" aria-label="Géneros">
              {genres.map((g) => <li key={g}>{g}</li>)}
            </ul>
          )}

          {title.overview && <p className="showcase__overview">{title.overview}</p>}

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

          <div className="showcase__score">
            <span className="showcase__label">Tu puntuación</span>
            <ScoreBug value={title.rating} onChange={onRate} label={`Califica ${title.title}`} />
          </div>

          <div className="showcase__status">
            <span className="showcase__label" id="status-label">Estado</span>
            <div className="segmented" role="radiogroup" aria-labelledby="status-label">
              {STATUS_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={title.status === o.value}
                  className={`segmented__option${title.status === o.value ? ' is-active' : ''}`}
                  onClick={() => title.status !== o.value && onStatus(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="showcase__actions">
            <button className="btn btn--primary btn--lg" onClick={onMarkWatched} disabled={marking}>
              {marking ? <IconSpinner /> : <IconCheck />}
              {marking ? 'Guardando…' : 'Marcar como visto'}
            </button>
            {title.tmdb_id && (
              <button className="btn btn--ghost btn--lg" onClick={onTrailer}>
                <IconPlay /> Ver tráiler
              </button>
            )}
          </div>

          {title.notes && (
            <div className="showcase__notes">
              <span className="showcase__label">Notas</span>
              <p>{title.notes}</p>
            </div>
          )}
        </div>

        {/* ── centre: the poster unfolds into its tilt ── */}
        <motion.div
          className="showcase__poster"
          variants={{
            hidden:  reduceMotion ? { opacity: 0 } : { opacity: 0, rotate: 0, scale: 0.86, x: offset, y: 24 },
            visible: reduceMotion
              ? { opacity: 1, rotate: POSTER_TILT }
              : { opacity: 1, rotate: POSTER_TILT, scale: 1, x: 0, y: 0, transition: { duration: 0.7, ease: EASE } },
          }}
          whileHover={reduceMotion ? undefined : { rotate: POSTER_TILT + 3, scale: 1.02, transition: { duration: 0.35, ease: EASE } }}
        >
          {posterSrc
            ? <img src={posterSrc} alt={`Póster de ${title.title}`} />
            : <div className="showcase__poster-fallback" aria-hidden="true"><IconFilmLarge /></div>}
          <ScoreBug value={title.rating} readonly size="lg" />
        </motion.div>
      </motion.div>

      {/* ── right: round side controls ── */}
      <nav className="side-controls" aria-label="Controles del título">
        <button className="side-controls__btn" onClick={onBack} aria-label="Volver"><IconBack /></button>
        <div className="side-controls__group">
          <button className="side-controls__btn" onClick={() => onNavigate(-1)} disabled={!neighbours.prev} aria-label={neighbours.prev ? `Anterior: ${neighbours.prev.title}` : 'No hay título anterior'}><IconPrev /></button>
          <span className="side-controls__count" aria-label={`Título ${neighbours.index + 1} de ${neighbours.total}`}>
            {neighbours.total > 0 ? `${neighbours.index + 1}/${neighbours.total}` : ''}
          </span>
          <button className="side-controls__btn" onClick={() => onNavigate(1)} disabled={!neighbours.next} aria-label={neighbours.next ? `Siguiente: ${neighbours.next.title}` : 'No hay título siguiente'}><IconNext /></button>
        </div>
        <button className="side-controls__btn" onClick={onEdit} aria-label="Editar título"><IconEdit /></button>
        <div className="side-controls__anchor">
          <button className="side-controls__btn" onClick={() => setListsOpen((v) => !v)} aria-expanded={listsOpen} aria-label="Agregar a una lista"><IconList /></button>
          <AnimatePresence>
            {listsOpen && <ListMenu titleId={title.id} onClose={() => setListsOpen(false)} />}
          </AnimatePresence>
        </div>
        {/* destructive action kept apart from the rest */}
        <button className="side-controls__btn side-controls__btn--danger" onClick={onDelete} aria-label="Eliminar título"><IconTrash /></button>
      </nav>

      {/* ── below the fold: what comes next, then the watch history ── */}
      <div className="showcase__more">{children}</div>

      <section className="history" aria-label="Historial">
        <header className="rail__header">
          <h2 className="rail__title">Historial</h2>
          <span className="rail__tag">{records.length === 0 ? 'Aún sin ver' : `${records.length} ${records.length === 1 ? 'vez' : 'veces'}`}</span>
        </header>
        {records.length === 0 ? (
          <p className="rail__empty">Usa “Marcar como visto” para registrar cada vez que lo veas.</p>
        ) : (
          <ol className="history__list">
            {records.map((r) => (
              <li key={r.id} className="history__item">
                <span className="history__date">{formatDate(r.watched_date)}</span>
                <ScoreBug value={r.rating} readonly size="sm" />
                <span className="history__meta">{[r.platform, r.note].filter(Boolean).join(' · ')}</span>
                <button className="history__remove" onClick={() => onDeleteRecord(r.id)} aria-label={`Quitar la vez del ${formatDate(r.watched_date)}`}>
                  <IconClose />
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

// ── TitleDetail ───────────────────────────────────────────────────────────
export default function TitleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const requireAuth = useRequireAuth();
  const { user } = useAuth();

  const [title,     setTitle]     = useState(null);
  const [records,   setRecords]   = useState([]);
  const [catalog,   setCatalog]   = useState([]);
  const [direction, setDirection] = useState(1);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [loading,   setLoading]   = useState(!isNew);
  const [saving,    setSaving]    = useState(false);
  const [marking,   setMarking]   = useState(false);
  const [error,     setError]     = useState(null);
  const [editing,   setEditing]   = useState(isNew);
  const [deleting,  setDeleting]  = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const showToast = useToast();

  useEffect(() => { setEditing(isNew); }, [isNew, id]);

  useEffect(() => {
    if (isNew) return;
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [data, all] = await Promise.all([
          window.electronAPI.getTitleById(Number(id)).then(unwrap),
          window.electronAPI.getAllTitles({}).then(unwrap),
        ]);
        if (cancelled) return;
        if (!data) { navigate('/catalog'); return; }
        const titleData = data.title ?? data;
        setTitle(titleData);
        setRecords(data.records ?? []);
        setCatalog(all);
        setForm({
          ...titleData,
          genres:       parseGenres(titleData.genres).map(genreLabel).join(', '),
          release_year: titleData.release_year ?? '',
          runtime:      titleData.runtime ?? '',
          rating:       titleData.rating  ?? 0,
        });
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, isNew, navigate, user]);

  // previous / next follow the catalog's order (newest first)
  const index = catalog.findIndex((t) => t.id === Number(id));
  const neighbours = {
    index: Math.max(index, 0),
    total: catalog.length,
    prev:  index > 0 ? catalog[index - 1] : null,
    next:  index >= 0 && index < catalog.length - 1 ? catalog[index + 1] : null,
  };

  function goTo(step) {
    const target = step < 0 ? neighbours.prev : neighbours.next;
    if (!target) return;
    setDirection(step);
    navigate(`/title/${target.id}`, { replace: true });
  }

  // arrow keys move through the catalog while nothing editable has focus
  useEffect(() => {
    if (editing || isNew) return undefined;
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowLeft') goTo(-1);
      if (e.key === 'ArrowRight') goTo(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    requireAuth(saveForm);
  }

  async function saveForm() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        release_year: form.release_year ? Number(form.release_year) : null,
        runtime:      form.runtime      ? Number(form.runtime)      : null,
        rating:       form.rating       ? Number(form.rating)       : null,
        genres: JSON.stringify(form.genres.split(',').map(genreKey).filter(Boolean)),
      };
      if (isNew) {
        const created = unwrap(await window.electronAPI.addTitle(payload));
        navigate(`/title/${created.id}`, { replace: true });
      } else {
        const updated = unwrap(await window.electronAPI.updateTitle(Number(id), payload));
        setTitle(updated);
        setEditing(false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function refreshCatalog() {
    const all = await window.electronAPI.getAllTitles({});
    if (!all?.error) setCatalog(all);
  }

  function handleDelete() {
    requireAuth(() => setDeleting(true));
  }

  async function confirmDelete() {
    unwrap(await window.electronAPI.deleteTitle(Number(id)));
    showToast({ message: `"${title.title}" se eliminó.` });
    navigate('/catalog');
  }

  function patchTitle(fields) {
    requireAuth(async () => {
      try {
        setTitle(unwrap(await window.electronAPI.updateTitle(Number(id), fields)));
        setForm((prev) => ({ ...prev, ...fields }));
      } catch (err) {
        setError(err.message);
      }
    });
  }

  function handleDeleteRecord(recordId) {
    requireAuth(async () => {
      try {
        unwrap(await window.electronAPI.deleteRecord(recordId));
        setRecords((prev) => prev.filter((r) => r.id !== recordId));
      } catch (err) {
        setError(err.message);
      }
    });
  }

  function handleMarkWatched() {
    requireAuth(markWatched);
  }

  async function markWatched() {
    setMarking(true);
    try {
      const newRecord = unwrap(await window.electronAPI.addRecord({
        title_id:     Number(id),
        watched_date: new Date().toISOString(),
        rating:       title.rating ?? null,
        status:       'completed',
      }));
      setRecords((prev) => [newRecord, ...prev]);
      if (title.status !== 'completed') {
        setTitle(unwrap(await window.electronAPI.updateTitle(Number(id), { status: 'completed' })));
        setForm((prev) => ({ ...prev, status: 'completed' }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setMarking(false);
    }
  }

  if (!user && !isNew) {
    return (
      <main className="page">
        <GuestPrompt title="Inicia sesión para ver este título" message="Los títulos, las puntuaciones y el historial pertenecen a tu cuenta." />
      </main>
    );
  }
  // keep showing the current title while the next one loads
  if (loading && !title) return <PageLoading message="Cargando título…" />;
  if (error && !title && !isNew) return <div className="page-error" role="alert">{error}</div>;

  const posterPreview = tmdbImage(form.poster_path, 'w342');

  return (
    <div className="title-detail-page">
      {error && <p className="form-error showcase__error" role="alert">{error}</p>}

      {!editing && title && (
        <Showcase
          title={title}
          records={records}
          direction={direction}
          neighbours={neighbours}
          marking={marking}
          onRate={(rating) => patchTitle({ rating })}
          onStatus={(status) => patchTitle({ status })}
          onMarkWatched={handleMarkWatched}
          onEdit={() => requireAuth(() => setEditing(true))}
          onDelete={handleDelete}
          onDeleteRecord={handleDeleteRecord}
          onNavigate={goTo}
          onBack={() => navigate(-1)}
          onTrailer={() => setTrailerOpen(true)}
        >
          {title.type === 'series' && title.tmdb_id && (
            <EpisodeTracker key={`episodes-${title.id}`} title={title} onTitleChanged={setTitle} />
          )}
          <TitleInsight key={`insight-${title.id}`} titleId={title.id} version={title.rating ?? 0} />
          {title.tmdb_id && <WatchProviders key={`watch-${title.id}`} title={title} />}
          {title.tmdb_id && (
            <RelatedTitles
              key={title.id}
              title={title}
              catalog={catalog}
              onOpen={(titleId) => navigate(`/title/${titleId}`)}
              onCatalogChanged={refreshCatalog}
            />
          )}
        </Showcase>
      )}

      {title?.tmdb_id && (
        <TrailerModal
          open={trailerOpen}
          onClose={() => setTrailerOpen(false)}
          tmdbId={title.tmdb_id}
          type={title.type}
          title={title.title}
        />
      )}

      {title && (
        <ConfirmDialog
          open={deleting}
          onClose={() => setDeleting(false)}
          onConfirm={confirmDelete}
          title="Eliminar título"
          message={`¿Eliminar “${title.title}” y su historial? No se puede deshacer.`}
        />
      )}

      {editing && (
        <main className="page title-edit">
          <div className="page__header title-edit__header">
            <div className="title-edit__heading">
              <h1 className="page__heading">{isNew ? 'Nuevo título' : title?.title}</h1>
              <div className="lower-third">
                <span className="lower-third__label"><span>{isNew ? 'Entrada manual' : 'Editando'}</span></span>
                <span className="lower-third__meta">
                  <span>{isNew ? 'Completa lo que sepas' : [typeLabel(form.type), form.release_year].filter(Boolean).join(' · ')}</span>
                </span>
              </div>
            </div>
            {!isNew && (
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(false)}>
                <IconClose /> Cancelar
              </button>
            )}
          </div>

          <div className="title-edit__layout">
            <form className="title-edit__form" onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="title">Título</label>
                <input id="title" name="title" value={form.title} onChange={handleChange} required autoFocus />
              </div>

              <div className="form-group">
                <label htmlFor="original_title">Título original</label>
                <input id="original_title" name="original_title" value={form.original_title ?? ''} onChange={handleChange} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="type">Tipo</label>
                  <select id="type" name="type" value={form.type} onChange={handleChange}>
                    <option value="movie">Película</option>
                    <option value="series">Serie</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="status">Estado</label>
                  <select id="status" name="status" value={form.status} onChange={handleChange}>
                    {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="release_year">Año</label>
                  <input id="release_year" name="release_year" type="number" min="1870" max="2100" value={form.release_year} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="runtime">Duración (min)</label>
                  <input id="runtime" name="runtime" type="number" min="1" value={form.runtime} onChange={handleChange} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="genres">Géneros (separados por comas)</label>
                <input id="genres" name="genres" value={form.genres} onChange={handleChange} placeholder="Acción, Drama, Comedia" />
              </div>

              <div className="form-group">
                <label htmlFor="overview">Sinopsis</label>
                <textarea id="overview" name="overview" rows={4} value={form.overview ?? ''} onChange={handleChange} />
              </div>

              <div className="form-group">
                <span className="form-group__label">Puntuación</span>
                <ScoreBug
                  value={Number(form.rating) || 0}
                  onChange={(val) => setForm((p) => ({ ...p, rating: val }))}
                  label="Puntuación"
                />
              </div>

              <div className="form-group">
                <label htmlFor="notes">Notas personales</label>
                <textarea id="notes" name="notes" rows={3} value={form.notes ?? ''} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label htmlFor="poster_path">URL del póster</label>
                <input id="poster_path" name="poster_path" value={form.poster_path ?? ''} onChange={handleChange} placeholder="https://… o una ruta de TMDB" />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn--primary btn--lg" disabled={saving}>
                  {saving ? <><IconSpinner /> Guardando…</> : isNew ? 'Crear título' : 'Guardar cambios'}
                </button>
              </div>
            </form>

            <aside className="title-edit__preview" aria-label="Vista previa del póster">
              {posterPreview
                ? <img src={posterPreview} alt="" />
                : <div className="showcase__poster-fallback"><IconFilmLarge /></div>}
            </aside>
          </div>
        </main>
      )}
    </div>
  );
}
