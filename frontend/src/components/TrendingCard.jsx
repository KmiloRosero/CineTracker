import React from 'react';
import { motion } from 'framer-motion';
import { cardVariants } from './cardAnimations';

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconSpinner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" style={{ animation: 'spin 1s linear infinite' }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}
function IconPosterPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/>
    </svg>
  );
}

/**
 * Poster card for a TMDB result that may not be in the local catalog yet.
 * `catalogId` is the local title id when it is already saved.
 */
export default function TrendingCard({ item, catalogId, adding, onAdd, onOpen }) {
  const posterUrl = item.poster_path ? `https://image.tmdb.org/t/p/w300${item.poster_path}` : null;
  const inCatalog = catalogId != null;

  return (
    <motion.article
      className={`title-card${inCatalog ? '' : ' title-card--static'}`}
      variants={cardVariants}
      onClick={inCatalog ? () => onOpen(catalogId) : undefined}
      onKeyDown={inCatalog ? (e) => e.key === 'Enter' && onOpen(catalogId) : undefined}
      role={inCatalog ? 'button' : undefined}
      tabIndex={inCatalog ? 0 : undefined}
      aria-label={inCatalog ? `${item.title}, in your catalog` : undefined}
    >
      <div className="title-card__poster">
        {posterUrl ? (
          <img src={posterUrl} alt={`Poster for ${item.title}`} loading="lazy" />
        ) : (
          <div className="title-card__poster--placeholder" aria-hidden="true">
            <IconPosterPlaceholder />
          </div>
        )}
      </div>

      <div className="title-card__info">
        <h3 className="title-card__title" title={item.title}>{item.title}</h3>
        <p className="title-card__meta">
          <span>{item.type === 'movie' ? 'Movie' : 'Series'}</span>
          {item.release_year && <span>{item.release_year}</span>}
        </p>
        {inCatalog ? (
          <span className="trending-card__saved"><IconCheck /> In your catalog</span>
        ) : (
          <button
            type="button"
            className="btn btn--ghost btn--sm trending-card__add"
            onClick={() => onAdd(item)}
            disabled={adding}
            aria-label={`Add ${item.title} to your catalog`}
          >
            {adding ? <IconSpinner /> : <IconPlus />}
            {adding ? 'Adding…' : 'Add'}
          </button>
        )}
      </div>
    </motion.article>
  );
}
