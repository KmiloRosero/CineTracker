import React, { useEffect, useMemo, useState } from 'react';
import FixtureCard from './FixtureCard';
import Rail, { RailEmpty } from './Rail';
import { useToast } from './Toast';
import { getTitleDetails, toCatalogPayload } from '../services/tmdbApi';
import { formatDate } from '../utils/labels';

const releaseLine = (item, verb = 'Estreno') =>
  (item.release_date ? `${verb}: ${formatDate(`${item.release_date}T12:00:00Z`)}` : 'Fecha por anunciar');

/**
 * What follows a title on its page: the saga in release order (or a series'
 * seasons and next episode), similar titles and upcoming releases in the
 * same genres. Titles not yet in the catalog can be added from here.
 */
export default function RelatedTitles({ title, catalog, onOpen, onCatalogChanged }) {
  const showToast = useToast();
  const [state, setState] = useState({ status: 'loading' });
  const [adding, setAdding] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    window.electronAPI.tmdbGetRelated(title.tmdb_id, title.type)
      .then((r) => {
        if (cancelled) return;
        if (r?.error) setState({ status: 'error', message: r.error });
        else setState({ status: 'ready', data: r });
      })
      .catch((err) => { if (!cancelled) setState({ status: 'error', message: err.message }); });
    return () => { cancelled = true; };
  }, [title.tmdb_id, title.type]);

  const byTmdbId = useMemo(() => new Map(catalog.filter((t) => t.tmdb_id != null).map((t) => [t.tmdb_id, t])), [catalog]);

  async function add(item) {
    setAdding(item.tmdb_id);
    try {
      const detail = await getTitleDetails(item.tmdb_id, item.type);
      const result = await window.electronAPI.addTitle(toCatalogPayload(detail));
      if (result?.error) throw new Error(result.error);
      showToast({ message: `"${detail.title}" se agregó a tu catálogo.` });
      await onCatalogChanged();
    } catch (err) {
      showToast({ message: err.message, type: 'error' });
    } finally {
      setAdding(null);
    }
  }

  // Catalog titles show their status and score; the rest can be added.
  function card(item, extra = {}) {
    const local = byTmdbId.get(item.tmdb_id);
    return (
      <FixtureCard
        key={`${item.type}-${item.tmdb_id}`}
        title={local}
        item={local ? undefined : item}
        adding={adding === item.tmdb_id}
        onAdd={add}
        onOpen={onOpen}
        {...extra}
      />
    );
  }

  if (state.status === 'loading') {
    return <Rail title="Lo que sigue" empty={<RailEmpty>Buscando la saga, títulos parecidos y próximos estrenos…</RailEmpty>} />;
  }
  if (state.status === 'error') {
    return <Rail title="Lo que sigue" empty={<RailEmpty>No se pudo cargar lo relacionado con este título. {state.message}</RailEmpty>} />;
  }

  const { collection, seasons, nextEpisode, similar, upcoming } = state.data;
  const currentIndex = collection ? collection.parts.findIndex((p) => p.current) : -1;

  return (
    <>
      {collection && (
        <Rail title="La saga en orden" sub={collection.name}>
          {collection.parts.map((part, i) => {
            const isNext = i === currentIndex + 1;
            let tag = null;
            if (part.current) tag = { text: 'Estás aquí', tone: 'here' };
            else if (isNext) tag = { text: part.upcoming ? 'Sigue · Próximamente' : 'Sigue', tone: 'next' };
            else if (part.upcoming) tag = { text: 'Próximamente', tone: 'soon' };
            return card(part, {
              order: i + 1,
              tag,
              current: part.current,
              dateLine: part.upcoming ? releaseLine(part) : undefined,
            });
          })}
        </Rail>
      )}

      {seasons.length > 0 && (
        <section className="rail" aria-label="Temporadas en orden">
          <header className="rail__header">
            <h2 className="rail__title">Temporadas en orden</h2>
            <span className="rail__tag">{seasons.length} {seasons.length === 1 ? 'temporada' : 'temporadas'}</span>
          </header>
          {nextEpisode && (
            <p className="rail__note" role="status">
              Próximo episodio: T{nextEpisode.season} E{nextEpisode.episode}
              {nextEpisode.name ? ` «${nextEpisode.name}»` : ''}
              {nextEpisode.air_date ? ` · ${formatDate(`${nextEpisode.air_date}T12:00:00Z`)}` : ''}
            </p>
          )}
          <ol className="season-list">
            {seasons.map((s) => (
              <li key={s.number} className={`season-list__item${s.upcoming ? ' is-upcoming' : ''}`}>
                <span className="season-list__number" aria-hidden="true">{s.number}</span>
                <span className="season-list__name">{s.name}</span>
                <span className="season-list__meta">
                  {s.episode_count ? `${s.episode_count} ${s.episode_count === 1 ? 'episodio' : 'episodios'}` : 'Episodios por anunciar'}
                </span>
                <span className="season-list__date">
                  {s.upcoming
                    ? <span className="fixture__tag fixture__tag--soon season-list__soon">{s.air_date ? `Próximamente · ${formatDate(`${s.air_date}T12:00:00Z`)}` : 'Próximamente'}</span>
                    : (s.air_date ? s.air_date.slice(0, 4) : '')}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <Rail
        title="Parecidas"
        sub="Recomendadas por TMDB"
        empty={similar.length === 0 ? <RailEmpty>TMDB todavía no tiene títulos parecidos a este.</RailEmpty> : undefined}
      >
        {similar.map((item) => card(item))}
      </Rail>

      <Rail
        title="Próximos estrenos"
        sub="Del mismo género"
        empty={upcoming.length === 0 ? <RailEmpty>No hay estrenos anunciados de este género por ahora.</RailEmpty> : undefined}
      >
        {upcoming.map((item) => card(item, { dateLine: releaseLine(item), tag: { text: 'Próximamente', tone: 'soon' } }))}
      </Rail>
    </>
  );
}
