import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import FixtureCard from '../components/FixtureCard';
import GuestPrompt from '../components/GuestPrompt';
import { ConfirmDialog } from '../components/Modal';
import { PageLoading, PageError } from '../components/PageLoading';
import { gridVariants } from '../components/cardAnimations';
import { IconClose, IconEdit, IconTrash, IconPlus, IconSpinner } from '../components/Icons';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

function unwrap(result) {
  if (result?.error) throw new Error(result.error);
  return result;
}

export default function ListDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const { user } = useAuth();

  const [list,     setList]     = useState(null);
  const [catalog,  setCatalog]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [newName,  setNewName]  = useState('');
  const [nameError, setNameError] = useState(null);
  const [toAdd,    setToAdd]    = useState('');
  const [busy,     setBusy]     = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [l, all] = await Promise.all([
        window.electronAPI.getList(Number(id)).then(unwrap),
        window.electronAPI.getAllTitles({}).then(unwrap),
      ]);
      setList(l);
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
  }, [user, id]);

  const addable = useMemo(() => {
    const inList = new Set((list?.titles ?? []).map((t) => t.id));
    return catalog.filter((t) => !inList.has(t.id)).sort((a, b) => a.title.localeCompare(b.title));
  }, [catalog, list]);

  async function rename(e) {
    e.preventDefault();
    setNameError(null);
    try {
      const updated = unwrap(await window.electronAPI.renameList(list.id, newName));
      setList((prev) => ({ ...prev, name: updated.name }));
      setRenaming(false);
    } catch (err) {
      setNameError(err.message);
    }
  }

  async function addTitle(e) {
    e.preventDefault();
    if (!toAdd) return;
    setBusy(true);
    try {
      unwrap(await window.electronAPI.addTitleToList(list.id, Number(toAdd)));
      setToAdd('');
      await load();
    } catch (err) {
      showToast({ message: err.message, type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function removeTitle(title) {
    try {
      unwrap(await window.electronAPI.removeTitleFromList(list.id, title.id));
      setList((prev) => ({ ...prev, titles: prev.titles.filter((t) => t.id !== title.id) }));
      showToast({ message: `Removed "${title.title}" from the list.` });
    } catch (err) {
      showToast({ message: err.message, type: 'error' });
    }
  }

  async function deleteList() {
    unwrap(await window.electronAPI.deleteList(list.id));
    showToast({ message: `List "${list.name}" deleted.` });
    navigate('/lists');
  }

  if (!user) {
    return <main className="page"><GuestPrompt title="Log in to see this list" message="Lists belong to your account." /></main>;
  }
  if (loading && !list) return <PageLoading message="Loading list…" />;
  if (error) return <PageError message={`Failed to load the list: ${error}`} onRetry={load} />;
  if (!list) return null;

  const count = list.titles.length;

  return (
    <main className="page list-detail">
      <Link to="/lists" className="back-link">All lists</Link>

      <header className="page__header list-detail__header">
        {renaming ? (
          <form className="rename-form" onSubmit={rename} noValidate>
            <label htmlFor="rename" className="sr-only">List name</label>
            <input id="rename" value={newName} maxLength={60} onChange={(e) => setNewName(e.target.value)} autoFocus aria-invalid={Boolean(nameError)} />
            <button type="submit" className="btn btn--primary">Save</button>
            <button type="button" className="btn btn--ghost" onClick={() => { setRenaming(false); setNameError(null); }}>Cancel</button>
            {nameError && <p className="field-error" role="alert">{nameError}</p>}
          </form>
        ) : (
          <>
            <h1 className="page__heading">{list.name}</h1>
            <span className="rail__tag">{count} {count === 1 ? 'title' : 'titles'}</span>
            <div className="list-detail__actions">
              <button className="btn btn--ghost" onClick={() => { setNewName(list.name); setRenaming(true); }}>
                <IconEdit size={16} /> Rename
              </button>
              <button className="btn btn--danger" onClick={() => setDeleting(true)}>
                <IconTrash size={16} /> Delete list
              </button>
            </div>
          </>
        )}
      </header>

      <form className="inline-create" onSubmit={addTitle}>
        <label htmlFor="add-to-list" className="form-group__label">Add a title from your catalog</label>
        <div className="inline-create__row">
          <select id="add-to-list" value={toAdd} onChange={(e) => setToAdd(e.target.value)} disabled={addable.length === 0}>
            <option value="">{addable.length === 0 ? 'Every title is already in this list' : 'Choose a title'}</option>
            {addable.map((t) => <option key={t.id} value={t.id}>{t.title}{t.release_year ? ` (${t.release_year})` : ''}</option>)}
          </select>
          <button type="submit" className="btn btn--primary btn--lg" disabled={!toAdd || busy}>
            {busy ? <IconSpinner /> : <IconPlus size={16} />} Add
          </button>
        </div>
      </form>

      {count === 0 ? (
        <div className="catalog__empty" role="status">
          <h2 className="catalog__empty-title">This list is empty</h2>
          <p>Pick a title above, or use the list button on any title page.</p>
        </div>
      ) : (
        <motion.div className="fixture-grid" variants={gridVariants} initial="hidden" animate="visible">
          {list.titles.map((t) => (
            <div key={t.id} className="list-entry">
              <FixtureCard title={t} onOpen={(tid) => navigate(`/title/${tid}`)} />
              <button className="list-entry__remove" onClick={() => removeTitle(t)} aria-label={`Remove ${t.title} from ${list.name}`}>
                <IconClose size={14} />
              </button>
            </div>
          ))}
        </motion.div>
      )}

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={deleteList}
        title="Delete list"
        message={`Delete the list “${list.name}”? The titles stay in your catalog.`}
        confirmLabel="Delete list"
      />
    </main>
  );
}
