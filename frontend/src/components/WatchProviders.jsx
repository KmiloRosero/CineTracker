import React, { useEffect, useState } from 'react';
import { RailEmpty } from './Rail';
import { IconExternal } from './Icons';
import { tmdbImage } from '../utils/tmdbImage';

const GROUPS = [
  ['flatrate', 'Incluida en suscripción'],
  ['free',     'Gratis'],
  ['rent',     'Alquiler'],
  ['buy',      'Compra'],
];

/**
 * Where to watch the title legally in Colombia, grouped by how (subscription,
 * free, rent, buy). Each service opens in the browser; data from JustWatch
 * through TMDB, credited as TMDB requires.
 */
export default function WatchProviders({ title }) {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    window.electronAPI.tmdbGetWatchProviders(title.tmdb_id, title.type, title.title)
      .then((r) => {
        if (cancelled) return;
        if (r?.error) setState({ status: 'error', message: r.error });
        else setState({ status: 'ready', data: r });
      })
      .catch((err) => { if (!cancelled) setState({ status: 'error', message: err.message }); });
    return () => { cancelled = true; };
  }, [title.tmdb_id, title.type, title.title]);

  const open = (url) => url && window.electronAPI.openWatchLink(url);
  const data = state.data;
  const groups = data ? GROUPS.filter(([key]) => data.groups[key].length > 0) : [];

  return (
    <section className="rail watch" aria-label="Dónde verla">
      <header className="rail__header">
        <h2 className="rail__title">Dónde verla</h2>
        <span className="rail__tag">En Colombia</span>
      </header>

      {state.status === 'loading' && <RailEmpty>Buscando en qué plataformas está…</RailEmpty>}
      {state.status === 'error' && <RailEmpty>No se pudo consultar dónde verla. {state.message}</RailEmpty>}
      {state.status === 'ready' && groups.length === 0 && (
        <RailEmpty>Por ahora no está en plataformas de streaming en Colombia.</RailEmpty>
      )}

      {groups.length > 0 && (
        <div className="watch__groups">
          {groups.map(([key, label]) => (
            <div key={key} className="watch__group">
              <h3 className="watch__label">{label}</h3>
              <ul className="watch__list">
                {data.groups[key].map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="watch__provider"
                      onClick={() => open(p.url)}
                      disabled={!p.url}
                      aria-label={`Ver en ${p.name} (${label.toLowerCase()}), se abre en el navegador`}
                    >
                      {p.logo_path
                        ? <img src={tmdbImage(p.logo_path, 'w92')} alt="" className="watch__logo" />
                        : <span className="watch__logo watch__logo--empty" aria-hidden="true">{p.name.charAt(0)}</span>}
                      <span className="watch__name">{p.name}</span>
                      <IconExternal size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {state.status === 'ready' && (
        <p className="watch__credit">
          Datos de JustWatch a través de TMDB. Los enlaces abren cada plataforma en tu navegador.
          {data.link && (
            <button type="button" className="watch__all" onClick={() => open(data.link)}>
              Ver todas las opciones <IconExternal size={14} />
            </button>
          )}
        </p>
      )}
    </section>
  );
}
