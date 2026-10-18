import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import TitleCard from '../components/TitleCard';
import TitleAutocomplete from '../components/TitleAutocomplete';
import ScoreBug from '../components/ScoreBug';
import Modal, { ConfirmDialog } from '../components/Modal';
import GuestPrompt from '../components/GuestPrompt';
import { PageError } from '../components/PageLoading';
import { gridVariants, cardVariants } from '../components/cardAnimations';
import { IconPlus, IconSearch, IconGrid, IconRows, IconFilm, IconTrash, IconSpinner, IconClose } from '../components/Icons';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useStoredState } from '../hooks/useStoredState';
import { canonicalGenres, genreLabel, genreKey } from '../utils/genres';
import { STATUS_LABEL, typeLabel, formatDate } from '../utils/labels';
import { tmdbImage } from '../utils/tmdbImage';

const STATUSES = ['watching', 'pending', 'completed', 'dropped'].map((value) => ({ value, label: STATUS_LABEL[value] }));

const SORTS = [
  { value: 'added',     label: 'Agregados recientemente', compare: (a, b) => b.added_at.localeCompare(a.added_at) || b.id - a.id },
  { value: 'title',     label: 'Título A–Z',      compare: (a, b) => a.title.localeCompare(b.title, 'es') },
  { value: 'score',     label: 'Mejor puntuación', compare: (a, b) => (b.rating ?? -1) - (a.rating ?? -1) || a.title.localeCompare(b.title, 'es') },
  { value: 'year-desc', label: 'Estreno más reciente', compare: (a, b) => (b.release_year ?? 0) - (a.release_year ?? 0) },
  { value: 'year-asc',  label: 'Estreno más antiguo', compare: (a, b) => (a.release_year ?? 9999) - (b.release_year ?? 9999) },
];
const VIEWS = ['grid', 'list'];

const EMPTY_FORM = {
  title: '', type: 'movie', genres: '', release_year: '',
  runtime: '', status: 'pending', overview: '', poster_path: '',
};

function unwrap(result) {
  if (result?.error) throw new Error(result.error);
  return result;
}

function formatAdded(iso) {
  // SQLite stores UTC as "YYYY-MM-DD HH:MM:SS"
  return formatDate(`${iso.replace(' ', 'T')}Z`);
}

// ── List view row ─────────────────────────────────────────────────────────
function CatalogRow({ title, onOpen, onDelete }) {
  const genres = canonicalGenres(title.genres).slice(0, 3).map(genreLabel);
  const meta = [typeLabel(title.type), title.release_year, title.runtime ? `${title.runtime} min` : null].filter(Boolean);
  return (
    <motion.li variants={cardVariants} className="catalog-row">
      <button className="catalog-row__main" onClick={() => onOpen(title.id)} aria-label={`Abrir ${title.title}`}>
        <span className="catalog-row__poster">
          {title.poster_path ? <img src={tmdbImage(title.poster_path, 'w92')} alt="" loading="lazy" /> : <IconFilm size={18} />}
        </span>
        <span className="catalog-row__title">{title.title}</span>
        <span className="catalog-row__meta">{meta.join(' · ')}</span>
        <span className="catalog-row__genres">{genres.join(' / ')}</span>
        <span className={`catalog-row__status status-slab--${title.status}`}>{STATUS_LABEL[title.status]}</span>
        <span className="catalog-row__score">
          {title.rating ? <ScoreBug value={title.rating} readonly size="sm" /> : <span className="catalog-row__unrated">Sin nota</span>}
        </span>
        <span className="catalog-row__added">{formatAdded(title.added_at)}</span>
      </button>
      <button className="catalog-row__delete" onClick={() => onDelete(title)} aria-label={`Eliminar ${title.title}`}>
        <IconTrash size={16} />
      </button>
    </motion.li>
  );
}

function CatalogSkeleton() {
  return (
    <div className="title-grid" aria-busy="true" aria-label="Cargando catálogo">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="title-card title-card--skeleton">
          <div className="title-card__poster skeleton" />
          <div className="skeleton skeleton--text" />
          <div className="skeleton skeleton--text skeleton--short" />
        </div>
      ))}
    </div>
  );
}

// ── Catalog ───────────────────────────────────────────────────────────────
export default function Catalog() {
  const navigate = useNavigate();
  const showToast = useToast();
  const { user } = useAuth();
  const requireAuth = useRequireAuth();

  const [titles,  setTitles]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [genre,  setGenre]  = useState('');
  const [sort,   setSort]   = useStoredState('cinetracker-catalog-sort', 'added', SORTS.map((s) => s.value));
  const [view,   setView]   = useStoredState('cinetracker-catalog-view', 'grid', VIEWS);

  const [modalMode, setModalMode] = useState('none'); // 'none' | 'search' | 'manual'
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState(null);
  const [toDelete,  setToDelete]  = useState(null);

  async function loadTitles() {
    setLoading(true);
    setError(null);
    try {
      setTitles(unwrap(await window.electronAPI.getAllTitles({})));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) loadTitles();
    else { setTitles([]); setLoading(false); }
  }, [user]);

  // ── derived ───────────────────────────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts = {};
    titles.forEach((t) => { counts[t.status] = (counts[t.status] ?? 0) + 1; });
    return counts;
  }, [titles]);

  const allGenres = useMemo(() => {
    const set = new Set();
    titles.forEach((t) => canonicalGenres(t.genres).forEach((g) => set.add(g)));
    return [...set].sort((a, b) => genreLabel(a).localeCompare(genreLabel(b), 'es'));
  }, [titles]);

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    const compare = (SORTS.find((s) => s.value === sort) ?? SORTS[0]).compare;
    return titles
      .filter((t) => {
        if (q && !t.title.toLowerCase().includes(q) && !(t.original_title ?? '').toLowerCase().includes(q)) return false;
        if (status && t.status !== status) return false;
        if (genre && !canonicalGenres(t.genres).includes(genre)) return false;
        return true;
      })
      .sort(compare);
  }, [titles, search, status, genre, sort]);

  const filtersActive = Boolean(search || status || genre);
  function clearFilters() { setSearch(''); setStatus(''); setGenre(''); }

  // ── handlers ─────────────────────────────────────────────────────────
  function openAdd() { requireAuth(() => setModalMode('search')); }

  function closeModal() {
    setModalMode('none');
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleManualSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setFormError('El título es obligatorio.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      unwrap(await window.electronAPI.addTitle({
        title:        form.title,
        type:         form.type,
        status:       form.status,
        overview:     form.overview    || null,
        poster_path:  form.poster_path || null,
        release_year: form.release_year ? Number(form.release_year) : null,
        runtime:      form.runtime      ? Number(form.runtime)      : null,
        genres:       JSON.stringify(form.genres.split(',').map(genreKey).filter(Boolean)),
      }));
      showToast({ message: `"${form.title.trim()}" se agregó a tu catálogo.` });
      closeModal();
      loadTitles();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleSearchSaved() {
    closeModal();
    loadTitles();
    showToast({ message: 'Título guardado en tu catálogo.' });
  }

  function askDelete(title) { requireAuth(() => setToDelete(title)); }

  async function confirmDelete() {
    unwrap(await window.electronAPI.deleteTitle(toDelete.id));
    showToast({ message: `"${toDelete.title}" se eliminó.` });
    loadTitles();
  }

  const openTitle = (id) => navigate(`/title/${id}`);

  // ── render ────────────────────────────────────────────────────────────
  return (
    <main className="page catalog">
      <header className="page__header">
        <h1 className="page__heading">Catálogo</h1>
        {user && !loading && titles.length > 0 && (
          <span className="rail__tag">{titles.length} {titles.length === 1 ? 'título' : 'títulos'}</span>
        )}
        <button className="btn btn--primary btn--lg catalog__add" onClick={openAdd}>
          <IconPlus size={16} /> Agregar título
        </button>
      </header>

      {!user && (
        <GuestPrompt
          title="Empieza tu catálogo"
          message="Inicia sesión para agregar películas y series, seguir lo que estás viendo y calificar lo que terminas."
        />
      )}

      {user && error && <PageError message={`No se pudo cargar tu catálogo: ${error}`} onRetry={loadTitles} />}

      {user && !error && (
        <>
          <div className="catalog__toolbar" role="search">
            <label className="catalog__search">
              <IconSearch size={16} />
              <span className="sr-only">Buscar en tus títulos</span>
              <input
                type="search"
                placeholder="Buscar en tus títulos"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>

            <div className="catalog__controls">
              <label className="select-field">
                <span className="select-field__label">Género</span>
                <select value={genre} onChange={(e) => setGenre(e.target.value)} disabled={allGenres.length === 0}>
                  <option value="">Todos los géneros</option>
                  {allGenres.map((g) => <option key={g} value={g}>{genreLabel(g)}</option>)}
                </select>
              </label>
              <label className="select-field">
                <span className="select-field__label">Orden</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
              <div className="view-toggle" role="group" aria-label="Vista">
                <button className={view === 'grid' ? 'is-active' : ''} aria-pressed={view === 'grid'} onClick={() => setView('grid')} aria-label="Vista en cuadrícula">
                  <IconGrid size={16} />
                </button>
                <button className={view === 'list' ? 'is-active' : ''} aria-pressed={view === 'list'} onClick={() => setView('list')} aria-label="Vista en lista">
                  <IconRows size={16} />
                </button>
              </div>
            </div>

            <div className="catalog__chips" role="group" aria-label="Filtrar por estado">
              <button className={`chip${status === '' ? ' chip--active' : ''}`} aria-pressed={status === ''} onClick={() => setStatus('')}>
                Todos <span className="chip__count">{titles.length}</span>
              </button>
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  className={`chip chip--${s.value}${status === s.value ? ' chip--active' : ''}`}
                  aria-pressed={status === s.value}
                  onClick={() => setStatus(status === s.value ? '' : s.value)}
                >
                  {s.label} <span className="chip__count">{statusCounts[s.value] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          {loading && <CatalogSkeleton />}

          {!loading && titles.length === 0 && (
            <div className="catalog__empty" role="status">
              <h2 className="catalog__empty-title">Aún no hay nada en cartelera</h2>
              <p>Busca una película o serie en TMDB, o agrégala a mano. Los pósters, géneros y reparto se guardan en este computador.</p>
              <button className="btn btn--primary btn--lg" onClick={openAdd}><IconPlus size={16} /> Agrega tu primer título</button>
            </div>
          )}

          {!loading && titles.length > 0 && visible.length === 0 && (
            <div className="catalog__empty" role="status">
              <h2 className="catalog__empty-title">Ningún título coincide</h2>
              <p>Nada en tu catálogo coincide con {search ? `“${search}”` : 'estos filtros'}.</p>
              <button className="btn btn--ghost" onClick={clearFilters}><IconClose size={14} /> Quitar filtros</button>
            </div>
          )}

          {!loading && visible.length > 0 && view === 'grid' && (
            <motion.div key={`grid-${sort}`} className="title-grid" variants={gridVariants} initial="hidden" animate="visible">
              {visible.map((t) => <TitleCard key={t.id} title={t} onClick={openTitle} onDelete={() => askDelete(t)} />)}
            </motion.div>
          )}

          {!loading && visible.length > 0 && view === 'list' && (
            <motion.ul key={`list-${sort}`} className="catalog-list" variants={gridVariants} initial="hidden" animate="visible">
              {visible.map((t) => <CatalogRow key={t.id} title={t} onOpen={openTitle} onDelete={askDelete} />)}
            </motion.ul>
          )}

          {!loading && visible.length > 0 && filtersActive && (
            <p className="catalog__count" aria-live="polite">
              Mostrando {visible.length} de {titles.length}
              <button className="catalog__clear" onClick={clearFilters}>Quitar filtros</button>
            </p>
          )}
        </>
      )}

      {/* ── add: TMDB search ── */}
      <Modal open={modalMode === 'search'} onClose={closeModal} title="Agregar un título" wide>
        <TitleAutocomplete onSaved={handleSearchSaved} onManualAdd={() => setModalMode('manual')} />
      </Modal>

      {/* ── add: manual entry ── */}
      <Modal open={modalMode === 'manual'} onClose={closeModal} title="Agregar a mano" wide>
        <button type="button" className="modal__back" onClick={() => setModalMode('search')}>Volver a la búsqueda en TMDB</button>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <form onSubmit={handleManualSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="m-title">Título</label>
            <input id="m-title" name="title" value={form.title} onChange={handleFormChange} required autoFocus maxLength={200} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="m-type">Tipo</label>
              <select id="m-type" name="type" value={form.type} onChange={handleFormChange}>
                <option value="movie">Película</option>
                <option value="series">Serie</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="m-status">Estado</label>
              <select id="m-status" name="status" value={form.status} onChange={handleFormChange}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="m-year">Año</label>
              <input id="m-year" name="release_year" type="number" min="1870" max="2100" value={form.release_year} onChange={handleFormChange} />
            </div>
            <div className="form-group">
              <label htmlFor="m-runtime">Duración (min)</label>
              <input id="m-runtime" name="runtime" type="number" min="1" max="2000" value={form.runtime} onChange={handleFormChange} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="m-genres">Géneros (separados por comas)</label>
            <input id="m-genres" name="genres" value={form.genres} onChange={handleFormChange} placeholder="Acción, Drama, Comedia" />
          </div>
          <div className="form-group">
            <label htmlFor="m-overview">Sinopsis</label>
            <textarea id="m-overview" name="overview" rows={3} value={form.overview} onChange={handleFormChange} />
          </div>
          <div className="form-group">
            <label htmlFor="m-poster">Póster (ruta de TMDB o URL de imagen)</label>
            <input id="m-poster" name="poster_path" value={form.poster_path} onChange={handleFormChange} placeholder="/abc123.jpg" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={closeModal}>Cancelar</button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving && <IconSpinner />} {saving ? 'Guardando…' : 'Agregar título'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar título"
        message={toDelete ? `¿Eliminar “${toDelete.title}” y su historial? No se puede deshacer.` : ''}
      />
    </main>
  );
}
