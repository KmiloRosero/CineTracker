import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconCheck, IconPlus, IconUser } from './Icons';
import { useToast } from './Toast';
import { tmdbImage } from '../utils/tmdbImage';
import { unwrap } from '../utils/ai';

const ROLE = { director: 'Dirección', creator: 'Creación', cast: 'Reparto' };
const MAX_CAST = 8;

/** Directors (or creators) and cast of a title, each one followable for "Estrenos". */
export default function PeopleFollow({ title }) {
  const showToast = useToast();
  const [people, setPeople] = useState(null);
  const [busy,   setBusy]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    window.electronAPI.getTitlePeople(title.tmdb_id, title.type)
      .then(unwrap)
      .then((p) => { if (!cancelled) setPeople(p); })
      .catch(() => { if (!cancelled) setPeople({ directors: [], cast: [] }); });
    return () => { cancelled = true; };
  }, [title.tmdb_id, title.type]);

  async function toggle(p) {
    setBusy(p.id);
    try {
      if (p.followed) {
        unwrap(await window.electronAPI.unfollow({ kind: 'person', id: p.id }));
      } else {
        unwrap(await window.electronAPI.follow({ kind: 'person', id: p.id, name: p.name, profile_path: p.profile_path, role: p.role }));
        showToast({ message: `Ahora sigues a ${p.name}: sus estrenos aparecerán en Estrenos.` });
      }
      const flip = (list) => list.map((x) => (x.id === p.id ? { ...x, followed: !p.followed } : x));
      setPeople((prev) => ({ directors: flip(prev.directors), cast: flip(prev.cast) }));
    } catch (err) {
      showToast({ message: err.message, type: 'error' });
    } finally {
      setBusy(null);
    }
  }

  const list = people ? [...people.directors, ...people.cast.slice(0, MAX_CAST)] : [];
  if (!people || list.length === 0) return null;

  return (
    <section className="rail people" aria-labelledby="people-title">
      <header className="rail__header">
        <h2 className="rail__title" id="people-title">Quién la hace</h2>
        <span className="rail__tag">Sigue a quien te guste</span>
        <div className="rail__action"><Link className="btn btn--ghost btn--sm" to="/upcoming">Ver estrenos</Link></div>
      </header>
      <ul className="people__grid">
        {list.map((p) => (
          <li key={`${p.role}-${p.id}`} className="person">
            <span className="person__photo">
              {p.profile_path ? <img src={tmdbImage(p.profile_path, 'w185')} alt="" loading="lazy" /> : <IconUser size={22} />}
            </span>
            <span className="person__text">
              <span className="person__name">{p.name}</span>
              <span className="person__role">{p.role === 'cast' ? (p.character ?? ROLE.cast) : ROLE[p.role]}</span>
            </span>
            <button
              type="button"
              className={`person__follow${p.followed ? ' is-on' : ''}`}
              aria-pressed={p.followed}
              aria-label={p.followed ? `Dejar de seguir a ${p.name}` : `Seguir a ${p.name}`}
              onClick={() => toggle(p)}
              disabled={busy !== null}
            >
              {p.followed ? <IconCheck size={14} /> : <IconPlus size={14} />}
              {p.followed ? 'Siguiendo' : 'Seguir'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
