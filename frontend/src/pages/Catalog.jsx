import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import TitleCard from '../components/TitleCard';
import TitleAutocomplete from '../components/TitleAutocomplete';
import { gridVariants } from '../components/cardAnimations';
import { PageLoading, PageError } from '../components/PageLoading';

const STATUS_OPTIONS = ['watching', 'completed', 'pending', 'dropped'];

const EMPTY_FORM = {
  title: '', type: 'movie', genres: '', release_year: '',
  runtime: '', status: 'pending', overview: '', poster_path: '',
};

// ── SVG icons ─────────────────────────────────────────────────────────────
function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function IconFilm() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="2"/>
      <line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
    </svg>
  );
}
function IconFilter() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  );
}
function IconSpinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

// ── Toast hook ────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const showToast = useCallback(({ message, type = 'success', duration = 3500 }) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}

// ── Toast container ───────────────────────────────────────────────────────
function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={`toast toast--${t.type}`}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.2 } }}
            exit={{ opacity: 0, y: 8, scale: 0.96, transition: { duration: 0.15 } }}
          >
            <span className="toast__icon">
              {t.type === 'success' ? <IconCheck /> : <IconClose />}
            </span>
            <span>{t.message}</span>
            <button
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px' }}
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss"
            >
              <IconClose />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Catalog ───────────────────────────────────────────────────────────────
export default function Catalog() {
  const navigate = useNavigate();
  const { toasts, showToast, dismissToast } = useToast();

  // catalog data
  const [titles,  setTitles]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // filter state
  const [search,       setSearch]       = useState('');
  const [activeStatus, setActiveStatus] = useState('');
  const [activeGenre,  setActiveGenre]  = useState('');

  // modal state: 'none' | 'autocomplete' | 'manual'
  const [modalMode, setModalMode] = useState('none');

  // manual form state
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState(null);

  // ── data loading ──────────────────────────────────────────────────────
  async function loadTitles() {
    setLoading(true);
    setError(null);
    try {
      const data = await window.electronAPI.getAllTitles({});
      setTitles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadTitles(); }, []);

  // ── derived ───────────────────────────────────────────────────────────
  const allGenres = useMemo(() => {
    const set = new Set();
    titles.forEach((t) => {
      try {
        const parsed = typeof t.genres === 'string' ? JSON.parse(t.genres) : t.genres;
        if (Array.isArray(parsed)) parsed.forEach((g) => g && set.add(g));
      } catch { /* ignore */ }
    });
    return [...set].sort();
  }, [titles]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return titles.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q)) return false;
      if (activeStatus && t.status !== activeStatus) return false;
      if (activeGenre) {
        try {
          const parsed = typeof t.genres === 'string' ? JSON.parse(t.genres) : t.genres;
          if (!Array.isArray(parsed) || !parsed.includes(activeGenre)) return false;
        } catch { return false; }
      }
      return true;
    });
  }, [titles, search, activeStatus, activeGenre]);

  // ── handlers ─────────────────────────────────────────────────────────
  async function handleDelete(id) {
    if (!window.confirm('Delete this title?')) return;
    await window.electronAPI.deleteTitle(id);
    loadTitles();
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleManualSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setFormError('Title is required.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        tmdb_id: null, original_title: null, backdrop_path: null,
        title:        form.title,
        type:         form.type,
        overview:     form.overview     || null,
        poster_path:  form.poster_path  || null,
        notes: null, rating: null,
        release_year: form.release_year ? Number(form.release_year) : null,
        runtime:      form.runtime      ? Number(form.runtime)      : null,
        status:       form.status,
        genres: JSON.stringify(form.genres.split(',').map((g) => g.trim()).filter(Boolean)),
      };
      await window.electronAPI.addTitle(payload);
      closeModal();
      loadTitles();
      showToast({ message: `"${form.title}" added to your catalog.` });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function closeModal() {
    setModalMode('none');
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function handleAutocompleteSaved() {
    closeModal();
    loadTitles();
    showToast({ message: 'Title saved to your catalog!' });
  }

  // ── render ────────────────────────────────────────────────────────────
  return (
    <main className="page catalog">
      {/* ── page header ── */}
      <div className="page__header">
        <h1 className="page__heading">Catalog</h1>
        <button className="btn btn--primary" onClick={() => setModalMode('autocomplete')}>
          <IconPlus /> Add Title
        </button>
      </div>

      {/* ── toolbar ── */}
      <div className="catalog__toolbar" role="search">
        <div className="catalog__toolbar-row">
          <div className="catalog__search-wrap">
            <span className="catalog__search-icon"><IconSearch /></span>
            <input
              type="search"
              className="catalog__search"
              placeholder="Search titles…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search titles"
            />
          </div>
        </div>

        <div className="catalog__toolbar-row">
          <span className="catalog__filter-label">Status</span>
          <div className="catalog__chips" role="group" aria-label="Filter by status">
            <button className={`chip${activeStatus === '' ? ' chip--active' : ''}`} onClick={() => setActiveStatus('')}>All</button>
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                className={`chip chip--${s}${activeStatus === s ? ' chip--active' : ''}`}
                onClick={() => setActiveStatus(activeStatus === s ? '' : s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {allGenres.length > 0 && (
          <div className="catalog__toolbar-row">
            <span className="catalog__filter-label">Genre</span>
            <div className="catalog__chips" role="group" aria-label="Filter by genre">
              <button className={`chip${activeGenre === '' ? ' chip--active' : ''}`} onClick={() => setActiveGenre('')}>All</button>
              {allGenres.map((g) => (
                <button
                  key={g}
                  className={`chip${activeGenre === g ? ' chip--active' : ''}`}
                  onClick={() => setActiveGenre(activeGenre === g ? '' : g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── states ── */}
      {loading && <PageLoading />}
      {error   && <PageError message={`Failed to load catalog: ${error}`} onRetry={loadTitles} />}

      {!loading && !error && filtered.length === 0 && (
        <div className="catalog__empty">
          <div className="catalog__empty__icon-wrap">
            {titles.length === 0 ? <IconFilm /> : <IconFilter />}
          </div>
          {titles.length === 0 ? (
            <>
              <h3>Your catalog is empty</h3>
              <p>Search TMDB or add a title manually to get started.</p>
              <button className="btn btn--primary" onClick={() => setModalMode('autocomplete')}>
                <IconPlus /> Add your first title
              </button>
            </>
          ) : (
            <>
              <h3>No results</h3>
              <p>No titles match your current filters.</p>
              <button className="btn btn--ghost btn--sm" onClick={() => { setSearch(''); setActiveStatus(''); setActiveGenre(''); }}>
                Clear filters
              </button>
            </>
          )}
        </div>
      )}

      {/* ── grid ── */}
      {!loading && !error && filtered.length > 0 && (
        <>
          <motion.div className="title-grid" variants={gridVariants} initial="hidden" animate="visible">
            {filtered.map((t) => (
              <TitleCard key={t.id} title={t} onClick={(id) => navigate(`/title/${id}`)} onDelete={handleDelete} />
            ))}
          </motion.div>
          <p className="catalog__count" aria-live="polite">
            {filtered.length} title{filtered.length !== 1 ? 's' : ''}
            {filtered.length !== titles.length && ` of ${titles.length}`}
          </p>
        </>
      )}

      {/* ── AUTOCOMPLETE MODAL ── */}
      <AnimatePresence>
        {modalMode === 'autocomplete' && (
          <motion.div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Add new title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.16 } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            <motion.div
              className="modal"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: 'easeOut' } }}
              exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.14 } }}
            >
              <div className="modal__header">
                <h2>Add New Title</h2>
                <button className="modal__close" onClick={closeModal} aria-label="Close"><IconClose /></button>
              </div>

              <TitleAutocomplete
                onSaved={handleAutocompleteSaved}
                onManualAdd={() => setModalMode('manual')}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MANUAL FORM MODAL ── */}
      <AnimatePresence>
        {modalMode === 'manual' && (
          <motion.div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Add title manually"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.16 } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            <motion.div
              className="modal"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: 'easeOut' } }}
              exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.14 } }}
            >
              <div className="modal__header">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <h2>Add Manually</h2>
                  <button
                    className="tac__manual-link"
                    style={{ fontSize: '.76rem', textAlign: 'left' }}
                    onClick={() => setModalMode('autocomplete')}
                  >
                    ← Back to TMDB search
                  </button>
                </div>
                <button className="modal__close" onClick={closeModal} aria-label="Close"><IconClose /></button>
              </div>

              {formError && <p className="form-error" role="alert">{formError}</p>}

              <form onSubmit={handleManualSubmit} noValidate>
                <div className="form-group">
                  <label htmlFor="m-title">Title *</label>
                  <input id="m-title" name="title" value={form.title} onChange={handleFormChange} required autoFocus />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="m-type">Type *</label>
                    <select id="m-type" name="type" value={form.type} onChange={handleFormChange}>
                      <option value="movie">Movie</option>
                      <option value="series">Series</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="m-status">Status</label>
                    <select id="m-status" name="status" value={form.status} onChange={handleFormChange}>
                      <option value="pending">Pending</option>
                      <option value="watching">Watching</option>
                      <option value="completed">Completed</option>
                      <option value="dropped">Dropped</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="m-year">Year</label>
                    <input id="m-year" name="release_year" type="number" min="1888" max="2100" value={form.release_year} onChange={handleFormChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="m-runtime">Runtime (min)</label>
                    <input id="m-runtime" name="runtime" type="number" min="1" value={form.runtime} onChange={handleFormChange} />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="m-genres">Genres (comma separated)</label>
                  <input id="m-genres" name="genres" value={form.genres} onChange={handleFormChange} placeholder="Action, Drama, Sci-Fi" />
                </div>

                <div className="form-group">
                  <label htmlFor="m-overview">Overview</label>
                  <textarea id="m-overview" name="overview" rows={3} value={form.overview} onChange={handleFormChange} />
                </div>

                <div className="form-group">
                  <label htmlFor="m-poster">Poster URL / TMDB path</label>
                  <input id="m-poster" name="poster_path" value={form.poster_path} onChange={handleFormChange} placeholder="https://… or /abc123.jpg" />
                  {form.poster_path && (
                    <img
                      className="tmdb-poster-preview"
                      src={form.poster_path.startsWith('http') ? form.poster_path : `https://image.tmdb.org/t/p/w92${form.poster_path}`}
                      alt="Poster preview"
                    />
                  )}
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn--ghost" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn--primary" disabled={saving}>
                    {saving ? <><IconSpinner /> Saving…</> : 'Add Title'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast notifications ── */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
