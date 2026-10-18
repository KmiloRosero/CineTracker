import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ScoreBug from './ScoreBug';
import { cardVariants } from './cardAnimations';
import { tmdbImage } from '../utils/tmdbImage';

const STATUS_LABEL = { pending: 'Pending', watching: 'Watching', completed: 'Completed', dropped: 'Dropped' };

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function IconPoster() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="2" width="18" height="20"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
    </svg>
  );
}

/**
 * A title as a broadcast fixture: registered poster, the name in the display
 * face, and a scoreline (status slab + score bug). Works for catalog titles
 * (`title`) and TMDB results (`item`, with an Add action until saved).
 */
export default function FixtureCard({ title, item, catalogId, explanation, explanationSource, adding, onOpen, onAdd }) {
  const [whyOpen, setWhyOpen] = useState(false);
  const source  = title ?? item;
  const localId = title?.id ?? catalogId ?? null;
  const meta = [
    source.release_year,
    source.runtime ? `${source.runtime} min` : null,
    source.type === 'movie' ? 'Movie' : 'Series',
  ].filter(Boolean);
  const open = localId ? () => onOpen(localId) : undefined;

  return (
    <motion.article
      className={`fixture${open ? '' : ' fixture--static'}`}
      variants={cardVariants}
      onClick={open}
      onKeyDown={open ? (e) => e.key === 'Enter' && open() : undefined}
      role={open ? 'button' : undefined}
      tabIndex={open ? 0 : undefined}
      aria-label={open ? `Open ${source.title}` : undefined}
    >
      <div className="fixture__poster">
        {source.poster_path
          ? <img src={tmdbImage(source.poster_path, 'w185')} alt="" loading="lazy" />
          : <span className="fixture__poster-fallback"><IconPoster /></span>}
      </div>

      <div className="fixture__body">
        <h3 className="fixture__title" title={source.title}>{source.title}</h3>
        {meta.length > 0 && <p className="fixture__meta">{meta.join(' · ')}</p>}

        <div className="fixture__scoreline">
          {title && (
            <span className={`fixture__status status-slab--${title.status}`}>{STATUS_LABEL[title.status]}</span>
          )}
          {title && <ScoreBug value={title.rating} readonly size="sm" />}
          {!title && catalogId && <span className="fixture__status status-slab--watching">In your catalog</span>}
          {!title && !catalogId && (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={(e) => { e.stopPropagation(); onAdd(item); }}
              onKeyDown={(e) => e.stopPropagation()}
              disabled={adding}
              aria-label={`Add ${source.title} to your catalog`}
            >
              <IconPlus /> {adding ? 'Adding…' : 'Add'}
            </button>
          )}
        </div>

        {explanation && (
          <div className="fixture__why">
            <button
              type="button"
              className="fixture__why-toggle"
              aria-expanded={whyOpen}
              onClick={(e) => { e.stopPropagation(); setWhyOpen((v) => !v); }}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {whyOpen ? 'Hide reason' : 'Why this?'}
            </button>
            <p className={`fixture__reason${whyOpen ? ' is-open' : ''}`}>{explanation}</p>
            {whyOpen && explanationSource && <p className="fixture__why-source">{explanationSource}</p>}
          </div>
        )}
      </div>
    </motion.article>
  );
}
