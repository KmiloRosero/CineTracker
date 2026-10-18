import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchTitle, getTitleDetails, toCatalogPayload } from '../services/tmdbApi';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { tmdbImage } from '../utils/tmdbImage';
import { genreLabel } from '../utils/genres';
import { typeLabel } from '../utils/labels';

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
  const requireAuth = useRequireAuth();
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
  // each search gets a number; a response is applied only if it is still the latest
  const requestRef  = useRef(0);

  // ── debounced search ─────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current);
    setSearchError(null);

    if (!query.trim()) {
      requestRef.current += 1; // drop any search still in flight
      setResults([]);
      setOpen(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestRef.current;
      try {
        const data = await searchTitle(query);
        if (requestId !== requestRef.current) return;
        setResults(data);
        setOpen(true);
        setActiveIdx(-1);
      } catch (err) {
        if (requestId !== requestRef.current) return;
        setSearchError(err.message);
        setResults([]);
        setOpen(true);
      } finally {
        if (requestId === requestRef.current) setSearching(false);
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
      const result = await window.electronAPI.addTitle(toCatalogPayload(preview));
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

  const posterUrl = (url) => tmdbImage(url, 'w342');
  const cast = Array.isArray(preview?.cast) ? preview.cast : [];

  return (
    <div className="tac" ref={containerRef}>
      {/* ── search input ── */}
      <div className="tac__input-wrap">
        <span className="tac__input-icon"><IconSearch /></span>
        <input
          ref={inputRef}
          type="search"
          className="tac__input"
          placeholder="Busca en TMDB: escribe el nombre de una película o serie…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); setPreview(null); }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          aria-label="Buscar en TMDB"
          role="combobox"
          aria-expanded={open}
          aria-controls="tac-results"
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-activedescendant={open && activeIdx >= 0 ? `tac-option-${activeIdx}` : undefined}
        />
        {searching && (
          <span className="tac__input-spinner"><IconSpinner /></span>
        )}
        {(query || selected) && !searching && (
          <button className="tac__input-clear" onClick={clearSelection} aria-label="Borrar búsqueda" tabIndex={-1}>
            <IconClose />
          </button>
        )}
      </div>

      {/* ── dropdown ── */}
      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            id="tac-results"
            className="tac__dropdown"
            role="listbox"
            aria-label="Resultados de búsqueda"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.14 } }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
          >
            {searchError && (
              <li className="tac__dropdown-msg tac__dropdown-error">
                <span>{searchError}</span>
                <button className="tac__manual-link" onClick={() => { setOpen(false); onManualAdd?.(); }}>
                  Agregar a mano
                </button>
              </li>
            )}

            {!searchError && results.length === 0 && !searching && (
              <li className="tac__dropdown-msg">
                No hay resultados para &ldquo;{query}&rdquo;
                <button className="tac__manual-link" onClick={() => { setOpen(false); onManualAdd?.(); }}>
                  Agregar a mano
                </button>
              </li>
            )}

            {results.map((r, i) => {
              const thumb = tmdbImage(r.poster_path, 'w92');
              return (
                <li
                  key={`${r.type}-${r.tmdb_id}`}
                  id={`tac-option-${i}`}
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
                        {typeLabel(r.type)}
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
          <IconSpinner /> Cargando detalles…
        </div>
      )}

      {/* ── detail error ── */}
      {detailError && (
        <p className="form-error tac__detail-error" role="alert">
          No se pudieron cargar los detalles: {detailError}
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
                  ? <img src={posterUrl(preview.poster_path)} alt={`Póster de ${preview.title}`} />
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
                    {typeLabel(preview.type)}
                  </span>
                  {preview.release_year && <span>{preview.release_year}</span>}
                  {preview.runtime && <span>{preview.runtime} min</span>}
                </div>

                {genreList.length > 0 && (
                  <div className="tac__preview-genres">
                    {genreList.map((g) => <span key={g} className="genre-tag">{genreLabel(g)}</span>)}
                  </div>
                )}

                {preview.overview && (
                  <p className="tac__preview-overview">{preview.overview}</p>
                )}

                {cast.length > 0 && (
                  <p className="tac__preview-cast">
                    <span className="tac__preview-cast-label">Reparto</span>
                    {cast.slice(0, 5).map((c) => c.name).join(', ')}
                  </p>
                )}

                {saveError && (
                  <p className="form-error" role="alert" style={{ marginTop: 8 }}>{saveError}</p>
                )}

                <div className="tac__preview-actions">
                  <motion.button
                    className="btn btn--primary"
                    onClick={() => requireAuth(handleSave)}
                    disabled={saving}
                    whileTap={{ scale: 0.97 }}
                  >
                    {saving
                      ? <><IconSpinner /> Guardando…</>
                      : <><IconCheck /> Guardar en mi catálogo</>
                    }
                  </motion.button>
                  <button className="btn btn--ghost btn--sm" onClick={clearSelection}>
                    Cancelar
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
          ¿No lo encuentras?{' '}
          <button className="tac__manual-link" onClick={() => onManualAdd?.()}>
            Agregar a mano
          </button>
        </p>
      )}
    </div>
  );
}
