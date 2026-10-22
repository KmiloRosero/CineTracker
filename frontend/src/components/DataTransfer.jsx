import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconUpload, IconSpinner } from './Icons';
import { useToast } from './Toast';
import { unwrap } from '../utils/ai';

const BATCH = 10;

const OUTCOME = {
  added:       'Agregados',
  updated:     'Completados',
  unchanged:   'Ya estaban',
  'not-found': 'No encontrados',
  error:       'Con error',
};

/**
 * "Tus datos" in Profile: export a backup (or a file for Letterboxd), and
 * import from Letterboxd, IMDb or a backup, previewed first, then sent in
 * small batches with progress and a summary of what happened to each row.
 */
export default function DataTransfer() {
  const showToast = useToast();
  const [exporting, setExporting] = useState(null);
  const [file,      setFile]      = useState(null);   // { name, content }
  const [preview,   setPreview]   = useState(null);
  const [error,     setError]     = useState(null);
  const [progress,  setProgress]  = useState(null);   // { done, total }
  const [results,   setResults]   = useState(null);
  const cancelRef = useRef(false);

  async function exportAs(format) {
    setExporting(format);
    try {
      const { fileName, content, count } = unwrap(await window.electronAPI.exportData(format));
      const saved = await window.electronAPI.saveTextFile(fileName, content);
      if (saved?.error) throw new Error(saved.error);
      if (saved?.ok) showToast({ message: `Se exportaron ${count} ${count === 1 ? 'título' : 'títulos'} en ${saved.name}.` });
    } catch (err) {
      showToast({ message: `No se pudo exportar: ${err.message}`, type: 'error' });
    } finally {
      setExporting(null);
    }
  }

  async function read(listAs, picked = file) {
    setError(null);
    try {
      setPreview(unwrap(await window.electronAPI.previewImport(picked.content, { fileName: picked.name, listAs })));
    } catch (err) {
      setPreview(null);
      setError(err.message);
    }
  }

  async function pick() {
    setResults(null);
    setProgress(null);
    const picked = await window.electronAPI.openTextFile();
    if (picked?.canceled) return;
    if (picked?.error) { setError(picked.error); return; }
    setFile(picked);
    await read(undefined, picked);
  }

  async function runImport() {
    cancelRef.current = false;
    const rows = preview.rows;
    const all = [];
    setProgress({ done: 0, total: rows.length });
    for (let i = 0; i < rows.length && !cancelRef.current; i += BATCH) {
      try {
        all.push(...unwrap(await window.electronAPI.importRows(rows.slice(i, i + BATCH))));
      } catch (err) {
        rows.slice(i, i + BATCH).forEach((r) => all.push({ key: r.key, title: r.title, outcome: 'error', message: err.message }));
      }
      setProgress({ done: Math.min(i + BATCH, rows.length), total: rows.length });
    }
    setResults({ rows: all, stopped: cancelRef.current });
    setProgress(null);
    setPreview(null);
    setFile(null);
  }

  const counts = results
    ? Object.keys(OUTCOME).map((k) => [k, results.rows.filter((r) => r.outcome === k).length]).filter(([, n]) => n > 0)
    : [];
  const missing = results?.rows.filter((r) => r.outcome === 'not-found' || r.outcome === 'error') ?? [];

  return (
    <div className="data-transfer">
      <h3 className="settings-subtitle">Exportar</h3>
      <p className="field-hint settings-hint">Una copia de todo tu catálogo (estados, notas, fechas en que viste cada título) que puedes volver a importar, o un archivo con tus películas vistas para el importador de Letterboxd.</p>
      <div className="data-transfer__actions">
        <button className="btn btn--ghost" onClick={() => exportAs('cinetracker')} disabled={exporting !== null}>
          {exporting === 'cinetracker' && <IconSpinner />} Copia de CineTracker (CSV)
        </button>
        <button className="btn btn--ghost" onClick={() => exportAs('letterboxd')} disabled={exporting !== null}>
          {exporting === 'letterboxd' && <IconSpinner />} Para Letterboxd (CSV)
        </button>
      </div>

      <h3 className="settings-subtitle">Importar</h3>
      <p className="field-hint settings-hint">
        Trae tu historial desde Letterboxd (Ajustes → Importar y exportar → Exportar datos: diary.csv, ratings.csv, watched.csv o watchlist.csv),
        desde IMDb (Tus calificaciones o tu Watchlist → Exportar) o desde una copia de CineTracker. Cada título se busca en TMDB; lo que ya tienes solo se completa, nunca se sobrescribe.
      </p>

      {!progress && (
        <button className="btn btn--primary" onClick={pick}>
          <IconUpload size={16} /> Elegir archivo CSV
        </button>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}

      {preview && !progress && (
        <div className="import-preview" aria-live="polite">
          <div className="import-preview__head">
            <span className="rail__tag">{preview.label}</span>
            <span className="import-preview__file">{file?.name}</span>
          </div>
          <p className="import-preview__count">
            {preview.total} {preview.total === 1 ? 'título' : 'títulos'} para importar
            {preview.skipped > 0 && ` · ${preview.skipped} episodios sueltos se omiten`}
          </p>
          {preview.ambiguous && (
            <div className="segmented segmented--page" role="radiogroup" aria-label="Estas películas">
              {[['completed', 'Ya las vi'], ['pending', 'Quiero verlas']].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={preview.listAs === value}
                  className={`segmented__option${preview.listAs === value ? ' is-active' : ''}`}
                  onClick={() => read(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <ul className="import-preview__sample">
            {preview.rows.slice(0, 5).map((r) => (
              <li key={r.key}>
                <span className="import-preview__title">{r.title}</span>
                <span className="import-preview__meta">
                  {[r.year, r.type === 'series' ? 'Serie' : r.type === 'movie' ? 'Película' : null, r.rating ? `${r.rating}/10` : null,
                    r.watchedDates.length ? `${r.watchedDates.length} ${r.watchedDates.length === 1 ? 'vez' : 'veces'}` : null,
                    r.status === 'pending' ? 'Pendiente' : null].filter(Boolean).join(' · ')}
                </span>
              </li>
            ))}
            {preview.total > 5 && <li className="import-preview__more">y {preview.total - 5} más</li>}
          </ul>
          <div className="data-transfer__actions">
            <button className="btn btn--primary btn--lg" onClick={runImport} disabled={preview.total === 0}>
              Importar {preview.total} {preview.total === 1 ? 'título' : 'títulos'}
            </button>
            <button className="btn btn--ghost btn--lg" onClick={() => { setPreview(null); setFile(null); }}>Cancelar</button>
          </div>
        </div>
      )}

      {progress && (
        <div className="import-progress" role="status" aria-live="polite">
          <div className="episodes__bar" role="progressbar" aria-label="Progreso de la importación" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
            <span className="episodes__fill" style={{ transform: `scaleX(${progress.done / progress.total})` }} />
          </div>
          <p>Importando {progress.done} de {progress.total}… Cada título se busca en TMDB, puede tardar unos minutos.</p>
          <button className="btn btn--ghost btn--sm" onClick={() => { cancelRef.current = true; }}>Detener</button>
        </div>
      )}

      {results && (
        <div className="import-results" role="status">
          <p className="import-results__lead">{results.stopped ? 'Importación detenida.' : 'Importación terminada.'}</p>
          <dl className="import-results__counts">
            {counts.map(([k, n]) => (
              <div key={k} className={`import-results__count import-results__count--${k}`}>
                <dt>{OUTCOME[k]}</dt><dd>{n}</dd>
              </div>
            ))}
          </dl>
          {missing.length > 0 && (
            <details className="import-results__missing">
              <summary>Ver los {missing.length} que no se pudieron importar</summary>
              <ul>{missing.map((r) => <li key={r.key}>{r.title}{r.message ? ` — ${r.message}` : ''}</li>)}</ul>
              <p className="field-hint">Puedes agregarlos a mano desde el <Link to="/catalog">Catálogo</Link>.</p>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
