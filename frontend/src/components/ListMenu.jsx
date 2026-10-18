import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

function unwrap(result) {
  if (result?.error) throw new Error(result.error);
  return result;
}

/**
 * Popover listing the user's lists with a checkbox per list for one title,
 * plus a field to create a new list that already contains it.
 */
export default function ListMenu({ titleId, onClose }) {
  const [lists,   setLists]   = useState(null);
  const [checked, setChecked] = useState(new Set());
  const [name,    setName]    = useState('');
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    Promise.all([
      window.electronAPI.getAllLists().then(unwrap),
      window.electronAPI.getListIdsForTitle(titleId).then(unwrap),
    ])
      .then(([all, ids]) => { setLists(all); setChecked(new Set(ids)); })
      .catch((err) => setError(err.message));
  }, [titleId]);

  // close on Escape or a click outside
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [onClose]);

  async function toggle(listId) {
    const inList = checked.has(listId);
    setError(null);
    try {
      unwrap(inList
        ? await window.electronAPI.removeTitleFromList(listId, titleId)
        : await window.electronAPI.addTitleToList(listId, titleId));
      setChecked((prev) => {
        const next = new Set(prev);
        if (inList) next.delete(listId); else next.add(listId);
        return next;
      });
    } catch (err) {
      setError(err.message);
    }
  }

  async function create(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true); setError(null);
    try {
      const list = unwrap(await window.electronAPI.createList(name));
      unwrap(await window.electronAPI.addTitleToList(list.id, titleId));
      setLists((prev) => [list, ...(prev ?? [])]);
      setChecked((prev) => new Set(prev).add(list.id));
      setName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      ref={ref}
      className="list-menu"
      role="dialog"
      aria-label="Add to list"
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0, transition: { duration: 0.18 } }}
    >
      <p className="list-menu__title">Add to list</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {lists === null && !error && <p className="list-menu__empty">Loading lists…</p>}
      {lists?.length === 0 && <p className="list-menu__empty">No lists yet. Create one below.</p>}
      {lists?.length > 0 && (
        <ul className="list-menu__items">
          {lists.map((l) => (
            <li key={l.id}>
              <label className="list-menu__item">
                <input type="checkbox" checked={checked.has(l.id)} onChange={() => toggle(l.id)} />
                <span>{l.name}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <form className="list-menu__create" onSubmit={create}>
        <input
          aria-label="New list name"
          placeholder="New list name"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn btn--primary btn--sm" disabled={busy || !name.trim()}>Create</button>
      </form>
    </motion.div>
  );
}
