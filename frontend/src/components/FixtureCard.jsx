import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ScoreBug from './ScoreBug';
import { cardVariants } from './cardAnimations';
import { tmdbImage } from '../utils/tmdbImage';
import { STATUS_LABEL, typeLabel } from '../utils/labels';

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
 * (`title`) and TMDB results (`item`, with an Add action until saved). In a
 * saga, `order` numbers the part, `tag` labels the poster
 * ({ text, tone: 'here' | 'next' | 'soon' }), `dateLine` gives a release date
 * and `current` frames the title being viewed. `reasonVisible` prints the
 * explanation open (generated lists, where the reason is the point) and
 * `onDismiss` adds a "No me interesa" control. A TMDB title that is not in
 * the catalog opens its preview page, so it can be read before adding it.
 */
export default function FixtureCard({ title, item, catalogId, explanation, explanationSource, reasonVisible = false, adding, onOpen, onAdd, onDismiss, order, tag, dateLine, current = false }) {
  const navigate = useNavigate();
  const [whyOpen, setWhyOpen] = useState(false);
  const source  = title ?? item;
  const localId = title?.id ?? catalogId ?? null;
  const previewable = !localId && item?.tmdb_id != null && (item.type === 'movie' || item.type === 'series');
  const meta = [
    source.release_year,
    source.runtime ? `${source.runtime} min` : null,
    typeLabel(source.type),
  ].filter(Boolean);
  const open = localId
    ? () => onOpen(localId)
    : previewable ? () => navigate(`/tmdb/${item.type}/${item.tmdb_id}`) : undefined;

  return (
    <motion.article
      className={`fixture${open ? '' : ' fixture--static'}${current ? ' fixture--current' : ''}`}
      aria-current={current ? 'page' : undefined}
      variants={cardVariants}
      onClick={open}
      onKeyDown={open ? (e) => e.key === 'Enter' && open() : undefined}
      role={open ? 'button' : undefined}
      tabIndex={open ? 0 : undefined}
      aria-label={open ? (localId ? `Abrir ${source.title}` : `Ver detalles de ${source.title}`) : undefined}
    >
      <div className="fixture__poster">
        {source.poster_path
          ? <img src={tmdbImage(source.poster_path, 'w185')} alt="" loading="lazy" />
          : <span className="fixture__poster-fallback"><IconPoster /></span>}
        {order != null && <span className="fixture__order" aria-hidden="true">{order}</span>}
        {tag && <span className={`fixture__tag fixture__tag--${tag.tone}`}>{tag.text}</span>}
      </div>

      <div className="fixture__body">
        <h3 className="fixture__title" title={source.title}>
          {order != null && <span className="sr-only">Parte {order}: </span>}
          {source.title}
        </h3>
        {meta.length > 0 && <p className="fixture__meta">{meta.join(' · ')}</p>}
        {dateLine && <p className="fixture__date">{dateLine}</p>}

        <div className="fixture__scoreline">
          {title && (
            <span className={`fixture__status status-slab--${title.status}`}>{STATUS_LABEL[title.status]}</span>
          )}
          {title && <ScoreBug value={title.rating} readonly size="sm" />}
          {!title && catalogId && <span className="fixture__status status-slab--watching">En tu catálogo</span>}
          {!title && !catalogId && (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={(e) => { e.stopPropagation(); onAdd(item); }}
              onKeyDown={(e) => e.stopPropagation()}
              disabled={adding}
              aria-label={`Agregar ${source.title} a tu catálogo`}
            >
              <IconPlus /> {adding ? 'Agregando…' : 'Agregar'}
            </button>
          )}
          {onDismiss && !title && !catalogId && (
            <button
              type="button"
              className="btn btn--ghost btn--sm fixture__dismiss"
              onClick={(e) => { e.stopPropagation(); onDismiss(item); }}
              onKeyDown={(e) => e.stopPropagation()}
              aria-label={`No me interesa ${source.title}`}
            >
              No me interesa
            </button>
          )}
        </div>

        {explanation && reasonVisible && (
          <div className="fixture__why">
            <p className="fixture__reason is-open">{explanation}</p>
            {explanationSource && <p className="fixture__why-source">{explanationSource}</p>}
          </div>
        )}

        {explanation && !reasonVisible && (
          <div className="fixture__why">
            <button
              type="button"
              className="fixture__why-toggle"
              aria-expanded={whyOpen}
              onClick={(e) => { e.stopPropagation(); setWhyOpen((v) => !v); }}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {whyOpen ? 'Ocultar motivo' : '¿Por qué este?'}
            </button>
            <p className={`fixture__reason${whyOpen ? ' is-open' : ''}`}>{explanation}</p>
            {whyOpen && explanationSource && <p className="fixture__why-source">{explanationSource}</p>}
          </div>
        )}
      </div>
    </motion.article>
  );
}
