import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import FixtureCard from '../components/FixtureCard';
import GuestPrompt from '../components/GuestPrompt';
import { PageLoading, PageError } from '../components/PageLoading';
import { gridVariants } from '../components/cardAnimations';
import { IconClose, IconUser } from '../components/Icons';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { getTitleDetails, toCatalogPayload } from '../services/tmdbApi';
import { tmdbImage } from '../utils/tmdbImage';
import { unwrap } from '../utils/ai';

function monthKey(date) {
  return date.slice(0, 7);
}

function monthTitle(key) {
  const label = new Date(`${key}-15T12:00:00`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function releaseLine(date) {
  return `Estreno: ${new Date(`${date}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}`;
}

/** "Estrenos": releases from followed people and genres, month by month. */
export default function Upcoming() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const [data,     setData]     = useState(null);
  const [catalog,  setCatalog]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [addingId, setAddingId] = useState(null);
  const [editingGenres, setEditingGenres] = useState(false);

  async function load() {
    setError(null);
    try {
      const [up, all] = await Promise.all([
        window.electronAPI.getUpcoming().then(unwrap),
        window.electronAPI.getAllTitles({}).then(unwrap),
      ]);
      setData(up);
      setCatalog(all);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) load();
    else setLoading(false);
  }, [user]);

  const catalogIds = useMemo(() => {
    const map = new Map();
    catalog.forEach((t) => { if (t.tmdb_id != null) map.set(`${t.type}:${t.tmdb_id}`, t.id); });
    return map;
  }, [catalog]);

  const months = useMemo(() => {
    const groups = new Map();
    (data?.items ?? []).forEach((i) => {
      const key = monthKey(i.release_date);
      groups.set(key, [...(groups.get(key) ?? []), i]);
    });
    return [...groups.entries()];
  }, [data]);

  async function change(action, target) {
    try {
      unwrap(await window.electronAPI[action](target));
      await load();
    } catch (err) {
      showToast({ message: err.message, type: 'error' });
    }
  }

  async function addOne(item) {
    setAddingId(item.tmdb_id);
    try {
      const detail = await getTitleDetails(item.tmdb_id, item.type);
      const created = unwrap(await window.electronAPI.addTitle(toCatalogPayload(detail)));
      setCatalog((prev) => [created, ...prev]);
      showToast({ message: `"${item.title}" quedó como pendiente.` });
    } catch (err) {
      showToast({ message: `No se pudo agregar "${item.title}": ${err.message}`, type: 'error' });
    } finally {
      setAddingId(null);
    }
  }

  if (!user) {
    return (
      <main className="page">
        <h1 className="page__heading">Estrenos</h1>
        <GuestPrompt title="Lo que viene para ti" message="Inicia sesión para seguir directores, actores y géneros y ver sus próximos estrenos." />
      </main>
    );
  }
  if (loading) return <PageLoading message="Buscando estrenos…" />;
  if (error && !data) return <PageError message={`No se pudieron cargar los estrenos: ${error}`} onRetry={load} />;

  const { follows, genres, followable } = data;
  const followedGenres = new Set(follows.genres.map((g) => g.genre));

  return (
    <main className="page upcoming">
      <header className="page__header">
        <h1 className="page__heading">Estrenos</h1>
        <span className="rail__tag">{data.items.length} en el próximo año</span>
      </header>

      <section className="following" aria-labelledby="following-title">
        <h2 className="following__title" id="following-title">Lo que sigues</h2>

        <div className="following__row">
          <span className="following__label">Personas</span>
          {follows.people.length === 0 ? (
            <span className="following__empty">Abre un título y usa “Seguir” en quien lo dirige o actúa.</span>
          ) : (
            <ul className="following__people">
              {follows.people.map((p) => (
                <li key={p.id} className="followed-person">
                  <span className="followed-person__photo">
                    {p.profile_path ? <img src={tmdbImage(p.profile_path, 'w92')} alt="" /> : <IconUser size={16} />}
                  </span>
                  <span className="followed-person__name">{p.name}</span>
                  <button type="button" className="followed-person__remove" onClick={() => change('unfollow', { kind: 'person', id: p.id })} aria-label={`Dejar de seguir a ${p.name}`}>
                    <IconClose size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="following__row">
          <span className="following__label">Géneros</span>
          <div className="following__genres">
            {genres.map((g) => (
              <span key={g.genre} className={`chip chip--active${g.auto ? ' chip--auto' : ''}`}>
                {g.label}{g.auto && <small className="chip__count">favorito</small>}
              </span>
            ))}
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditingGenres((v) => !v)} aria-expanded={editingGenres}>
              {editingGenres ? 'Listo' : 'Elegir géneros'}
            </button>
          </div>
        </div>
        {genres.some((g) => g.auto) && !editingGenres && (
          <p className="following__hint">Seguimos tus géneros favoritos hasta que elijas los tuyos.</p>
        )}
        {editingGenres && (
          <div className="following__picker" role="group" aria-label="Géneros que sigues">
            {followable.map((g) => {
              const on = followedGenres.has(g.genre);
              return (
                <button
                  key={g.genre}
                  type="button"
                  className={`chip${on ? ' chip--active' : ''}`}
                  aria-pressed={on}
                  onClick={() => change(on ? 'unfollow' : 'follow', { kind: 'genre', genre: g.genre })}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {data.failed > 0 && <p className="rail__note" role="status">No se pudo consultar parte de lo que sigues; revisa tu conexión.</p>}

      {months.length === 0 ? (
        <div className="catalog__empty" role="status">
          <h2 className="catalog__empty-title">Nada en el horizonte</h2>
          <p>Sigue a directores o actores desde la página de un título, o elige géneros arriba, y aquí verás lo que viene.</p>
        </div>
      ) : (
        months.map(([key, items]) => (
          <section key={key} className="rail upcoming__month" aria-label={monthTitle(key)}>
            <header className="rail__header">
              <h2 className="rail__title">{monthTitle(key)}</h2>
              <span className="rail__tag">{items.length} {items.length === 1 ? 'estreno' : 'estrenos'}</span>
            </header>
            <motion.div className="fixture-grid" variants={gridVariants} initial="hidden" animate="visible">
              {items.map((i) => (
                <FixtureCard
                  key={`${i.type}-${i.tmdb_id}`}
                  item={i}
                  catalogId={catalogIds.get(`${i.type}:${i.tmdb_id}`)}
                  dateLine={releaseLine(i.release_date)}
                  tag={i.people.length ? { text: 'Sigues', tone: 'next' } : undefined}
                  explanation={i.reason}
                  reasonVisible
                  adding={addingId === i.tmdb_id}
                  onAdd={addOne}
                  onOpen={(id) => navigate(`/title/${id}`)}
                />
              ))}
            </motion.div>
          </section>
        ))
      )}
    </main>
  );
}
