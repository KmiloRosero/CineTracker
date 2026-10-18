import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import GuestPrompt from '../components/GuestPrompt';
import { PageError } from '../components/PageLoading';
import { gridVariants, cardVariants } from '../components/cardAnimations';
import { IconPlus, IconSpinner, IconFilm } from '../components/Icons';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { tmdbImage } from '../utils/tmdbImage';

function unwrap(result) {
  if (result?.error) throw new Error(result.error);
  return result;
}

const MAX_NAME = 60;

const STRIP = 6;

function formatCreated(iso) {
  const date = new Date(`${iso.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** A list as a fixture row: name and count at left, its posters registered at one scale. */
function ListRow({ list, onOpen }) {
  const count = list.titles.length;
  const shown = list.titles.slice(0, STRIP);
  return (
    <motion.li variants={cardVariants}>
      <button type="button" className="list-row" onClick={() => onOpen(list.id)} aria-label={`Open ${list.name}, ${count} ${count === 1 ? 'title' : 'titles'}`}>
        <span className="list-row__info">
          <span className="list-row__name">{list.name}</span>
          <span className="list-row__meta">
            <span className="rail__tag">{count} {count === 1 ? 'title' : 'titles'}</span>
            <span className="list-row__date">Created {formatCreated(list.created_at)}</span>
          </span>
        </span>
        <span className="list-row__strip" aria-hidden="true">
          {shown.map((t) => (
            <span key={t.id} className="list-row__poster">
              {t.poster_path ? <img src={tmdbImage(t.poster_path, 'w185')} alt="" loading="lazy" /> : <IconFilm size={18} />}
            </span>
          ))}
          {count === 0 && <span className="list-row__empty">No titles yet</span>}
          {count > STRIP && <span className="list-row__more">+{count - STRIP}</span>}
        </span>
      </button>
    </motion.li>
  );
}

export default function Lists() {
  const navigate = useNavigate();
  const showToast = useToast();
  const { user } = useAuth();
  const inputRef = useRef(null);

  const [lists,     setLists]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [name,      setName]      = useState('');
  const [creating,  setCreating]  = useState(false);
  const [nameError, setNameError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setLists(unwrap(await window.electronAPI.getAllLists()));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) load();
    else { setLists([]); setLoading(false); }
  }, [user]);

  async function create(e) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) { setNameError('Give the list a name.'); inputRef.current?.focus(); return; }
    setCreating(true);
    setNameError(null);
    try {
      const list = unwrap(await window.electronAPI.createList(clean));
      setName('');
      showToast({ message: `List "${list.name}" created.` });
      navigate(`/lists/${list.id}`);
    } catch (err) {
      setNameError(err.message);
    } finally {
      setCreating(false);
    }
  }

  if (!user) {
    return (
      <main className="page">
        <h1 className="page__heading">Lists</h1>
        <GuestPrompt title="Group titles your way" message="Log in to make lists for a movie night, a marathon or a genre you are exploring." />
      </main>
    );
  }

  return (
    <main className="page lists">
      <header className="page__header">
        <h1 className="page__heading">Lists</h1>
        {!loading && lists.length > 0 && <span className="rail__tag">{lists.length} {lists.length === 1 ? 'list' : 'lists'}</span>}
      </header>

      <form className="inline-create" onSubmit={create} noValidate>
        <label htmlFor="new-list" className="form-group__label">New list</label>
        <div className="inline-create__row">
          <input
            id="new-list"
            ref={inputRef}
            value={name}
            maxLength={MAX_NAME}
            placeholder="Friday horror night"
            onChange={(e) => { setName(e.target.value); setNameError(null); }}
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? 'new-list-error' : undefined}
          />
          <button type="submit" className="btn btn--primary btn--lg" disabled={creating}>
            {creating ? <IconSpinner /> : <IconPlus size={16} />} Create list
          </button>
        </div>
        {nameError && <p id="new-list-error" className="field-error" role="alert">{nameError}</p>}
      </form>

      {error && <PageError message={`Failed to load your lists: ${error}`} onRetry={load} />}

      {!error && loading && (
        <div className="list-rows" aria-busy="true" aria-label="Loading lists">
          {Array.from({ length: 3 }, (_, i) => <div key={i} className="list-row list-row--skeleton skeleton" />)}
        </div>
      )}

      {!error && !loading && lists.length === 0 && (
        <div className="catalog__empty" role="status">
          <h2 className="catalog__empty-title">No lists yet</h2>
          <p>Name your first list above, then add titles to it from any title page with the list button.</p>
        </div>
      )}

      {!error && !loading && lists.length > 0 && (
        <motion.ul className="list-rows" variants={gridVariants} initial="hidden" animate="visible">
          {lists.map((l) => <ListRow key={l.id} list={l} onOpen={(id) => navigate(`/lists/${id}`)} />)}
        </motion.ul>
      )}
    </main>
  );
}
