import React from 'react';
import { motion } from 'framer-motion';
import RatingStars from './RatingStars';
import { cardVariants } from './cardAnimations';

const STATUS_LABELS = {
  pending:   'Pending',
  watching:  'Watching',
  completed: 'Completed',
  dropped:   'Dropped',
};

// ── Drawn icons — consistent stroke weight, no emoji ─────────────────────
function IconFilmPlaceholder() {
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

function IconTvPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}

function IconFilmType() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  );
}

function IconTvType() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

// ── TitleCard ─────────────────────────────────────────────────────────────
export default function TitleCard({ title, onClick, onDelete }) {
  const posterUrl = title.poster_path
    ? title.poster_path.startsWith('http')
      ? title.poster_path
      : `https://image.tmdb.org/t/p/w300${title.poster_path}`
    : null;

  const rating = title.rating != null ? Number(title.rating) : null;
  const isMovie = title.type === 'movie';

  return (
    <motion.article
      className="title-card"
      variants={cardVariants}
      whileHover={{ y: -4, boxShadow: '0 8px 28px rgba(0,0,0,.65)', transition: { duration: 0.18 } }}
      whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
      onClick={() => onClick?.(title.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(title.id)}
      aria-label={`${title.title}, ${STATUS_LABELS[title.status] ?? title.status}`}
    >
      <div className="title-card__poster">
        {posterUrl ? (
          <img src={posterUrl} alt={`Poster for ${title.title}`} loading="lazy" />
        ) : (
          <div className="title-card__poster--placeholder" aria-hidden="true">
            {isMovie ? <IconFilmPlaceholder /> : <IconTvPlaceholder />}
          </div>
        )}
        <span
          className={`status-badge status-${title.status}`}
          aria-label={`Status: ${STATUS_LABELS[title.status]}`}
        >
          {STATUS_LABELS[title.status] ?? title.status}
        </span>
      </div>

      <div className="title-card__info">
        <h3 className="title-card__title" title={title.title}>{title.title}</h3>
        <p className="title-card__meta">
          <span className="title-card__type-icon">
            {isMovie ? <IconFilmType /> : <IconTvType />}
          </span>
          {title.release_year && <span>{title.release_year}</span>}
          {title.runtime && <span>{title.runtime}m</span>}
        </p>
        {rating != null && rating > 0 && (
          <RatingStars value={rating} readonly size="sm" />
        )}
      </div>

      {onDelete && (
        <motion.button
          className="title-card__delete"
          aria-label={`Delete ${title.title}`}
          whileTap={{ scale: 0.88 }}
          onClick={(e) => { e.stopPropagation(); onDelete(title.id); }}
        >
          <IconClose />
        </motion.button>
      )}
    </motion.article>
  );
}
