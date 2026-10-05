import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import RatingStars from '../components/RatingStars';
import { PageLoading } from '../components/PageLoading';

// ── constants — untouched ─────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'pending',   label: 'Pending' },
  { value: 'watching',  label: 'Watching' },
  { value: 'completed', label: 'Completed' },
  { value: 'dropped',   label: 'Dropped' },
];

const EMPTY_FORM = {
  title: '', original_title: '', type: 'movie', overview: '',
  release_year: '', runtime: '', status: 'pending', rating: 0,
  notes: '', poster_path: '', genres: '',
};

// ── SVG icons ─────────────────────────────────────────────────────────────
function IconArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  );
}
function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconFilm() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  );
}
function IconTv() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}
function IconFilmLarge() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="2"/>
      <line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <line x1="2" y1="7" x2="7" y2="7"/><line x1="17" y1="7" x2="22" y2="7"/>
      <line x1="17" y1="17" x2="22" y2="17"/><line x1="2" y1="17" x2="7" y2="17"/>
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
function IconClose() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

const STATUS_LABEL = { pending: 'Pending', watching: 'Watching', completed: 'Completed', dropped: 'Dropped' };

// ── TitleDetail ───────────────────────────────────────────────────────────
export default function TitleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  // ── state — untouched ──────────────────────────────────────────────────
  const [title,   setTitle]   = useState(null);
  const [records, setRecords] = useState([]);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving,  setSaving]  = useState(false);
  const [marking, setMarking] = useState(false);
  const [error,   setError]   = useState(null);
  const [editing, setEditing] = useState(isNew);

  // ── data fetching — untouched ──────────────────────────────────────────
  useEffect(() => {
    if (isNew) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [data, recs] = await Promise.all([
          window.electronAPI.getTitleById(Number(id)),
          window.electronAPI.getRecordsByTitle(Number(id)),
        ]);
        if (!data) { navigate('/catalog'); return; }
        const titleData   = data.title   ?? data;
        const recordsData = data.records ?? recs ?? [];
        setTitle(titleData);
        setRecords(recordsData);
        setForm({
          ...titleData,
          genres:       parseGenres(titleData.genres).join(', '),
          release_year: titleData.release_year ?? '',
          runtime:      titleData.runtime ?? '',
          rating:       titleData.rating  ?? 0,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, isNew, navigate]);

  function parseGenres(raw) {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        release_year: form.release_year ? Number(form.release_year) : null,
        runtime:      form.runtime      ? Number(form.runtime)      : null,
        rating:       form.rating       ? Number(form.rating)       : null,
        genres: JSON.stringify(form.genres.split(',').map((g) => g.trim()).filter(Boolean)),
      };
      if (isNew) {
        const created = await window.electronAPI.addTitle(payload);
        navigate(`/title/${created.id}`, { replace: true });
      } else {
        const updated = await window.electronAPI.updateTitle(Number(id), payload);
        setTitle(updated);
        setEditing(false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Permanently delete this title?')) return;
    await window.electronAPI.deleteTitle(Number(id));
    navigate('/catalog');
  }

  async function handleMarkWatched() {
    setMarking(true);
    try {
      const record = {
        title_id:     Number(id),
        watched_date: new Date().toISOString(),
        rating:       title.rating ?? null,
        platform:     null,
        status:       'completed',
        note:         null,
      };
      const newRecord = await window.electronAPI.addRecord(record);
      setRecords((prev) => [newRecord, ...prev]);
      if (title.status !== 'completed') {
        const updated = await window.electronAPI.updateTitle(Number(id), { status: 'completed' });
        setTitle(updated);
        setForm((prev) => ({ ...prev, status: 'completed' }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setMarking(false);
    }
  }

  // ── derived values ────────────────────────────────────────────────────
  if (loading) return <PageLoading />;
  if (error && !title) return <div className="page-error">{error}</div>;

  const genres    = title ? parseGenres(title.genres) : [];
  const isMovie   = (title?.type ?? form.type) === 'movie';
  const posterSrc = (() => {
    const p = title?.poster_path || form.poster_path;
    if (!p) return null;
    return p.startsWith('http') ? p : `https://image.tmdb.org/t/p/w300${p}`;
  })();
  const backdropSrc = (() => {
    const p = title?.backdrop_path;
    if (!p) return null;
    return p.startsWith('http') ? p : `https://image.tmdb.org/t/p/w1280${p}`;
  })();

  // ── render ────────────────────────────────────────────────────────────
  return (
    <div className="title-detail-page">

      {/* ── hero ── */}
      {backdropSrc && !editing ? (
        <div className="title-detail__hero" aria-hidden="true">
          <img className="title-detail__hero-img" src={backdropSrc} alt="" />
          <div className="title-detail__hero-gradient" />
        </div>
      ) : (
        <div className="title-detail__hero title-detail__hero--plain" aria-hidden="true" />
      )}

      {/* ── top bar ── */}
      <div className="title-detail__bar">
        <button className="btn btn--ghost btn--sm" onClick={() => navigate(-1)}>
          <IconArrowLeft /> Back
        </button>
        {isNew && <h1 className="page__heading title-detail__bar-heading">{`New Title`}</h1>}
        {!isNew && (
          <div className="title-detail__bar-actions">
            <button className="btn btn--ghost btn--sm" onClick={() => setEditing((v) => !v)}>
              {editing ? <><IconClose /> Cancel</> : <><IconEdit /> Edit</>}
            </button>
            <button className="btn btn--danger btn--sm" onClick={handleDelete}>
              <IconTrash /> Delete
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="title-detail__error">
          <p className="form-error" role="alert">{error}</p>
        </div>
      )}

      {/* ── DETAIL VIEW ── */}
      {!editing && title && (
        <motion.div
          className="title-detail__content"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: 'easeOut' } }}
        >
          <div className="title-detail__layout">

            {/* poster */}
            <aside className="title-detail__poster">
              {posterSrc ? (
                <img src={posterSrc} alt={`Poster for ${title.title}`} />
              ) : (
                <div className="title-detail__poster--placeholder" aria-hidden="true">
                  <IconFilmLarge />
                </div>
              )}
            </aside>

            {/* info */}
            <div className="title-detail__info">

              {/* title */}
              <div className="title-detail__title-row">
                <h1 className="title-detail__title-main">{title.title}</h1>
                {title.original_title && title.original_title !== title.title && (
                  <span className="title-detail__title-original">{title.original_title}</span>
                )}
              </div>

              {/* meta strip */}
              <div className="title-detail__meta">
                <span className={`status-badge status-${title.status}`}>
                  {STATUS_LABEL[title.status] ?? title.status}
                </span>
                <span className="title-detail__meta-sep">·</span>
                <span className="title-detail__type">
                  {isMovie ? <IconFilm /> : <IconTv />}
                  {isMovie ? 'Movie' : 'Series'}
                </span>
                {title.release_year && (
                  <><span className="title-detail__meta-sep">·</span><span>{title.release_year}</span></>
                )}
                {title.runtime && (
                  <><span className="title-detail__meta-sep">·</span><span>{title.runtime} min</span></>
                )}
              </div>

              {/* genres */}
              {genres.length > 0 && (
                <div className="title-detail__genres">
                  {genres.map((g) => <span key={g} className="genre-tag">{g}</span>)}
                </div>
              )}

              {/* overview */}
              {title.overview && (
                <p className="title-detail__overview">{title.overview}</p>
              )}

              {/* rating */}
              <div className="title-detail__rating-block">
                <span className="title-detail__rating-label">Your Rating</span>
                <div className="title-detail__rating-row">
                  <RatingStars
                    value={Number(title.rating) || 0}
                    onChange={async (val) => {
                      const updated = await window.electronAPI.updateTitle(Number(id), { rating: val });
                      setTitle(updated);
                    }}
                  />
                  {title.rating > 0 && (
                    <span className="title-detail__rating-value">{title.rating} / 10</span>
                  )}
                </div>
              </div>

              {/* notes */}
              {title.notes && (
                <div className="title-detail__notes-block">
                  <span className="title-detail__notes-label">Notes</span>
                  <p className="title-detail__notes-text">{title.notes}</p>
                </div>
              )}

              {/* actions */}
              <div className="title-detail__actions">
                <button
                  className="btn btn--primary"
                  onClick={handleMarkWatched}
                  disabled={marking}
                >
                  {marking ? <><IconSpinner /> Saving…</> : <><IconCheck /> Mark as Watched</>}
                </button>
              </div>

              {/* watch history */}
              {records.length > 0 && (
                <section className="watch-history">
                  <h2 className="watch-history__heading">
                    Watch History · {records.length} {records.length === 1 ? 'entry' : 'entries'}
                  </h2>
                  <ul className="watch-history__list">
                    {records.map((r) => (
                      <li key={r.id} className="watch-history__item">
                        <span className="watch-history__date">
                          {new Date(r.watched_date).toLocaleDateString('en-CO', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </span>
                        <div className="watch-history__mid">
                          {r.rating != null && <RatingStars value={r.rating} readonly size="sm" />}
                          {r.note && <span className="watch-history__note">{r.note}</span>}
                        </div>
                        {r.platform && (
                          <span className="watch-history__platform">{r.platform}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

            </div>
          </div>
        </motion.div>
      )}

      {/* ── EDIT / NEW FORM ── */}
      {editing && (
        <div className="title-detail__content title-detail__edit-container">
          <form className="title-detail__form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input id="title" name="title" value={form.title} onChange={handleChange} required autoFocus />
            </div>

            <div className="form-group">
              <label htmlFor="original_title">Original Title</label>
              <input id="original_title" name="original_title" value={form.original_title ?? ''} onChange={handleChange} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="type">Type *</label>
                <select id="type" name="type" value={form.type} onChange={handleChange}>
                  <option value="movie">Movie</option>
                  <option value="series">Series</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="status">Status *</label>
                <select id="status" name="status" value={form.status} onChange={handleChange}>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="release_year">Year</label>
                <input id="release_year" name="release_year" type="number" min="1888" max="2100" value={form.release_year} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="runtime">Runtime (min)</label>
                <input id="runtime" name="runtime" type="number" min="1" value={form.runtime} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="genres">Genres (comma separated)</label>
              <input id="genres" name="genres" value={form.genres} onChange={handleChange} placeholder="Action, Drama, Sci-Fi" />
            </div>

            <div className="form-group">
              <label htmlFor="overview">Overview</label>
              <textarea id="overview" name="overview" rows={4} value={form.overview ?? ''} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Rating</label>
              <RatingStars
                value={Number(form.rating) || 0}
                onChange={(val) => setForm((p) => ({ ...p, rating: val }))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes">Personal Notes</label>
              <textarea id="notes" name="notes" rows={3} value={form.notes ?? ''} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label htmlFor="poster_path">Poster URL</label>
              <input id="poster_path" name="poster_path" value={form.poster_path ?? ''} onChange={handleChange} placeholder="https://… or TMDB path" />
            </div>

            <div className="form-actions">
              {!isNew && (
                <button type="button" className="btn btn--ghost" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              )}
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? <><IconSpinner /> Saving…</> : isNew ? 'Create Title' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
