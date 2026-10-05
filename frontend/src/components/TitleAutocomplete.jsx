import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchTitle, getTitleDetails } from '../services/tmdbApi';

// ── Icons ─────────────────────────────────────────────────────────────────
function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
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
function IconFilm() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  );
}
function IconTv() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
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
function IconClose() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

// ── TitleAutocomplete ─────────────────────────────────────────────────────
export default function TitleAutocomplete({ onSaved, onManualAdd }) {
  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [open,        setOpen]        = useState(false);
  const [activeIdx,   setActiveIdx]   = useState(-1);

  const [selected,    setSelected]    = useState(null); // search result stub
  const [preview,     setPreview]     = useState(null); // full detail object
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError,   setDetailError]   = useState(null);

  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState(null);

  const inputRef    = useRef(null);
  const listRef     = useRef(null);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // ── debounced search ─────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current);
    setSearchError(null);

    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchTitle(query);
        setResults(data);
        setOpen(true);
        setActiveIdx(-1);
      } catch (err) {
        setSearchError(err.message);
        setResults([]);
        setOpen(true);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // ── close dropdown on outside click ─────────────────────────────────
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setActiveIdx(-1);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── scroll active item into view ─────────────────────────────────────
  useEffect(() => {
    if (!listRef.current || activeIdx < 0) return;
    const item = listRef.current.children[activeIdx];
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  // ── keyboard navigation ───────────────────────────────────────────────
  function handleKeyDown(e) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && results[activeIdx]) pickResult(results[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIdx(-1);
    }
  }

  // ── select a result → fetch full details ─────────────────────────────
  const pickResult = useCallback(async (result) => {
    setSelected(result);
    setOpen(false);
    setQuery(result.title);
    setResults([]);
    setPreview(null);
    setDetailError(null);
    setSaveError(null);
    setLoadingDetail(true);

    try {
      const detail = await getTitleDetails(result.tmdb_id, result.type);
      setPreview(detail);
    } catch (err) {
      setDetailError(err.message);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // ── save to catalog ───────────────────────────────────────────────────
  async function handleSave() {
    if (!preview) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        tmdb_id:        preview.tmdb_id        ?? null,
        type:           preview.type,
        title:          preview.title,
        original_title: preview.original_title ?? null,
        overview:       preview.overview       ?? null,
        poster_path:    preview.poster_path    ?? null,
        backdrop_path:  preview.backdrop_path  ?? null,
        release_year:   preview.release_year   ?? null,
        runtime:        preview.runtime        ?? null,
        genres: JSON.stringify(
          typeof preview.genres === 'string'
            ? preview.genres.split(',').map((g) => g.trim()).filter(Boolean)
            : (Array.isArray(preview.genres) ? preview.genres : [])
        ),
        status: 'pending',
        rating: null,
        notes:  null,
      };
      const result = await window.electronAPI.addTitle(payload);
      if (result?.error) throw new Error(result.error);

      // reset
      setQuery('');
      setSelected(null);
      setPreview(null);
      setSaveError(null);
      onSaved?.();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function clearSelection() {
    setSelected(null);
    setPreview(null);
    setDetailError(null);
    setSaveError(null);
    setQuery('');
    inputRef.current?.focus();
  }

  const genreList = preview?.genres
    ? (typeof preview.genres === 'string'
        ? preview.genres.split(',').map((g) => g.trim()).filter(Boolean)
        : preview.genres)
    : [];

  const posterUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `https://image.tmdb.org/t/p/w300${url}`;
  };

  return (
    <div className="tac" ref={containerRef}>
      {/* ── search input ── */}
      <div className="tac__input-wrap">
        <span className="tac__input-icon"><IconSearch /></span>
        <input
          ref={inputRef}
          type="search"
          className="tac__input"
          placeholder="Search TMDB — type a movie or series name…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); setPreview(null); }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          aria-label="Search TMDB"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
        {searching && (
          <span className="tac__input-spinner"><IconSpinner /></span>
        )}
        {(query || selected) && !searching && (
          <button className="tac__input-clear" onClick={clearSelection} aria-label="Clear search" tabIndex={-1}>
            <IconClose />
          </button>
        )}
      </div>

      {/* ── dropdown ── */}
      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            className="tac__dropdown"
            role="listbox"
            aria-label="Search results"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.14 } }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
          >
            {searchError && (
              <li className="tac__dropdown-msg tac__dropdown-error">
                <span>{searchError}</span>
                <button className="tac__manual-link" onClick={() => { setOpen(false); onManualAdd?.(); }}>
                  Add manually
                </button>
              </li>
            )}

            {!searchError && results.length === 0 && !searching && (
              <li className="tac__dropdown-msg">
                No results found for &ldquo;{query}&rdquo;
                <button className="tac__manual-link" onClick={() => { setOpen(false); onManualAdd?.(); }}>
                  Add manually
                </button>
              </li>
            )}

            {results.map((r, i) => {
              const thumb = r.poster_path
                ? `https://image.tmdb.org/t/p/w92${r.poster_path}`
                : null;
              return (
                <li
                  key={r.tmdb_id}
                  className={`tac__result${i === activeIdx ? ' tac__result--active' : ''}`}
                  role="option"
                  aria-selected={i === activeIdx}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => pickResult(r)}
                >
                  <div className="tac__result-thumb">
                    {thumb
                      ? <img src={thumb} alt="" loading="lazy" />
                      : <div className="tac__result-thumb-placeholder">{r.type === 'movie' ? <IconFilm /> : <IconTv />}</div>
                    }
                  </div>
                  <div className="tac__result-info">
                    <span className="tac__result-title">{r.title}</span>
                    <span className="tac__result-meta">
                      <span className={`tac__type-badge tac__type-badge--${r.type}`}>
                        {r.type === 'movie' ? <IconFilm /> : <IconTv />}
                        {r.type === 'movie' ? 'Movie' : 'Series'}
                      </span>
                      {r.release_year && <span>{r.release_year}</span>}
                    </span>
                  </div>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>

      {/* ── detail loading ── */}
      {loadingDetail && (
        <div className="tac__detail-loading">
          <IconSpinner /> Fetching details…
        </div>
      )}

      {/* ── detail error ── */}
      {detailError && (
        <p className="form-error tac__detail-error" role="alert">
          Could not load details: {detailError}
        </p>
      )}

      {/* ── preview card ── */}
      <AnimatePresence>
        {preview && !loadingDetail && (
          <motion.div
            className="tac__preview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            <div className="tac__preview-layout">
              {/* poster */}
              <div className="tac__preview-poster">
                {posterUrl(preview.poster_path)
                  ? <img src={posterUrl(preview.poster_path)} alt={`Poster for ${preview.title}`} />
                  : <div className="tac__preview-poster-placeholder"><IconFilm /></div>
                }
              </div>

              {/* info */}
              <div className="tac__preview-info">
                <h3 className="tac__preview-title">{preview.title}</h3>
                {preview.original_title && preview.original_title !== preview.title && (
                  <p className="tac__preview-original">{preview.original_title}</p>
                )}

                <div className="tac__preview-meta">
                  <span className={`tac__type-badge tac__type-badge--${preview.type}`}>
                    {preview.type === 'movie' ? <IconFilm /> : <IconTv />}
                    {preview.type === 'movie' ? 'Movie' : 'Series'}
                  </span>
                  {preview.release_year && <span>{preview.release_year}</span>}
                  {preview.runtime && <span>{preview.runtime} min</span>}
                </div>

                {genreList.length > 0 && (
                  <div className="tac__preview-genres">
                    {genreList.map((g) => <span key={g} className="genre-tag">{g}</span>)}
                  </div>
                )}

                {preview.overview && (
                  <p className="tac__preview-overview">{preview.overview}</p>
                )}

                {saveError && (
                  <p className="form-error" role="alert" style={{ marginTop: 8 }}>{saveError}</p>
                )}

                <div className="tac__preview-actions">
                  <motion.button
                    className="btn btn--primary"
                    onClick={handleSave}
                    disabled={saving}
                    whileTap={{ scale: 0.97 }}
                  >
                    {saving
                      ? <><IconSpinner /> Saving…</>
                      : <><IconCheck /> Save to my catalog</>
                    }
                  </motion.button>
                  <button className="btn btn--ghost btn--sm" onClick={clearSelection}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── manual fallback link (always visible below input, before results) ── */}
      {!preview && !selected && (
        <p className="tac__fallback">
          Can&apos;t find it?{' '}
          <button className="tac__manual-link" onClick={() => onManualAdd?.()}>
            Add manually
          </button>
        </p>
      )}
    </div>
  );
}
