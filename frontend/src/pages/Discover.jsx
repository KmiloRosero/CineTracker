import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import FixtureCard from '../components/FixtureCard';
import TonightPicker from '../components/TonightPicker';
import DescribeSearch from '../components/DescribeSearch';
import TrailerModal from '../components/TrailerModal';
import GuestPrompt from '../components/GuestPrompt';
import { PageError } from '../components/PageLoading';
import { gridVariants } from '../components/cardAnimations';
import { IconSpinner } from '../components/Icons';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { getTitleDetails, toCatalogPayload } from '../services/tmdbApi';
import { aiName, fallbackNote, sourceLabel, unwrap } from '../utils/ai';

const TYPES = [
  { value: 'movie',  label: 'Películas' },
  { value: 'series', label: 'Series' },
];

const EASE = [0.16, 1, 0.3, 1];

function styleMeta(s) {
  const seen = `${s.count} ${s.count === 1 ? 'visto' : 'vistos'}`;
  return s.avgRating != null ? `${seen} · media ${s.avgRating}` : seen;
}

// ── Style board: one slab per style the catalog shows ────────────────────
function StyleBoard({ styles, value, onChange }) {
  return (
    <div className="style-board" role="radiogroup" aria-label="Estilo de la lista">
      {styles.map((s) => {
        const active = s.id === value;
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={active}
            className={`style-slab${active ? ' is-active' : ''}`}
            onClick={() => onChange(s)}
          >
            <span className="style-slab__name">{s.label}</span>
            <span className="style-slab__meta">{styleMeta(s)}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Generated list ───────────────────────────────────────────────────────
function GeneratedList({ result, catalogIds, addingId, saving, busy, refining, onAdd, onDismiss, onSave, onRegenerate, onMore, onTrailer, onOpen }) {
  const count = result.items.length;
  const note = refining || result.provisional ? null : fallbackNote(result, 'La lista se armó con reglas: recomendaciones de TMDB para tus mejores títulos y tus géneros favoritos.');
  const source = result.source === 'ai'
    ? `Motivo escrito por ${aiName(result)} a partir de tus calificaciones.`
    : 'Motivo calculado con tus calificaciones y los datos de TMDB.';

  return (
    <motion.div
      className="generated"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } }}
    >
      <header className="generated__header">
        <div className="lower-third">
          <span className="lower-third__label"><span>{sourceLabel(result)}</span></span>
          <span className="lower-third__meta"><span>{count} {count === 1 ? 'título' : 'títulos'} · {result.type === 'movie' ? 'películas' : 'series'}</span></span>
        </div>
        <h3 className="generated__name">{result.name}</h3>
        {result.intro && <p className="generated__intro">{result.intro}</p>}
        <div className="generated__actions">
          <button className="btn btn--primary btn--lg" onClick={onSave} disabled={saving || count === 0}>
            {saving && <IconSpinner />}
            {saving ? 'Guardando…' : 'Guardar como lista'}
          </button>
          <button className="btn btn--ghost btn--lg" onClick={onRegenerate} disabled={busy !== null}>
            {busy === 'refresh' && <IconSpinner />}
            {busy === 'refresh' ? 'Armando…' : 'Otra versión'}
          </button>
        </div>
        {result.chips?.length > 0 && (
          <p className="tonight__understood generated__understood">
            <span className="tonight__understood-label">Entendí</span>
            {result.chips.map((c) => <span key={c} className="tonight__chip">{c}</span>)}
          </p>
        )}
        <p className="generated__hint">Guardarla agrega a tu catálogo, como pendientes, los títulos que aún no tienes.</p>
      </header>

      {refining && (
        <p className="tonight__refining tonight__refining--page" role="status">
          <IconSpinner /> La IA está eligiendo y explicando los mejores de tu estilo; mientras tanto, estos son los de las reglas.
        </p>
      )}
      {note && <p className="rail__note" role="status">{note}</p>}

      <motion.div className="fixture-grid" variants={gridVariants} initial="hidden" animate="visible">
        <AnimatePresence initial={false}>
          {result.items.map((item) => (
            <FixtureCard
              key={`${item.type}-${item.tmdb_id}`}
              item={item}
              catalogId={catalogIds.get(`${item.type}:${item.tmdb_id}`)}
              explanation={item.reason}
              explanationSource={source}
              reasonVisible
              providers={item.providers}
              onMine={item.onMine}
              onTrailer={onTrailer}
              adding={addingId === item.tmdb_id}
              onAdd={onAdd}
              onDismiss={onDismiss}
              onOpen={onOpen}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      <div className="tonight__more">
        <button className="btn btn--ghost btn--lg" onClick={onMore} disabled={busy !== null}>
          {busy === 'more' && <IconSpinner />}
          {busy === 'more' ? 'Buscando…' : 'Ver 10 más'}
        </button>
        <span className="tonight__count">{count} títulos · cada vez que pides más, son otros</span>
      </div>
    </motion.div>
  );
}

// ── Descubrir ────────────────────────────────────────────────────────────
export default function Discover() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();

  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [catalog,   setCatalog]   = useState([]);
  const [platforms, setPlatforms] = useState([]);

  const [styleId,   setStyleId]   = useState(null);
  const [type,      setType]      = useState('movie');
  const [mods,      setMods]      = useState([]);
  const [result,    setResult]    = useState(null);
  const [busy,      setBusy]      = useState(null); // 'generate' | 'refresh' | 'more' | null
  const [request,   setRequest]   = useState('');
  const [shownKeys, setShownKeys] = useState([]);
  const [trailer,   setTrailer]   = useState(null);
  const [refining,  setRefining]  = useState(false);
  const listRequest = useRef(0); // the newest request wins
  const [genError,  setGenError]  = useState(null);
  const [addingId,  setAddingId]  = useState(null);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return undefined; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      window.electronAPI.getDiscoverStyles().then(unwrap),
      window.electronAPI.getAllTitles({}).then(unwrap),
      window.electronAPI.getMyPlatforms().then(unwrap).catch(() => []),
    ])
      .then(([styles, all, mine]) => {
        if (cancelled) return;
        setData(styles);
        setCatalog(all);
        setPlatforms(mine);
        const first = styles.styles[0];
        if (first) { setStyleId((id) => id ?? first.id); setType((t) => (styleId ? t : first.type)); }
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, reloadKey]);

  const catalogIds = useMemo(() => {
    const map = new Map();
    catalog.forEach((t) => { if (t.tmdb_id != null) map.set(`${t.type}:${t.tmdb_id}`, t.id); });
    return map;
  }, [catalog]);

  const style = data?.styles.find((s) => s.id === styleId) ?? null;

  function pickStyle(s) {
    setStyleId(s.id);
    setType(s.type);
  }

  function toggleMod(id) {
    setMods((prev) => {
      if (prev.includes(id)) return prev.filter((m) => m !== id);
      // recent and classic exclude each other
      const rest = prev.filter((m) => !(id === 'recent' && m === 'classic') && !(id === 'classic' && m === 'recent'));
      return [...rest, id];
    });
  }

  // 'new': a fresh list; 'refresh' ("Otra versión"): a new list without the one on screen;
  // 'more' ("Ver 10 más"): ten more, never repeating anything shown for this list
  // Two answers per request: the rules' list at once, then (with an AI key) the
  // AI's, which replaces it (or, for "Ver 10 más", the ten just added).
  async function generate(mode = 'new') {
    if (!style) return;
    const id = ++listRequest.current;
    setBusy(mode === 'new' ? 'generate' : mode);
    setRefining(false);
    setGenError(null);
    const onScreen = (result?.items ?? []).map((i) => `${i.type}:${i.tmdb_id}`);
    const exclude = mode === 'more' ? shownKeys : mode === 'refresh' ? onScreen : [];
    const appending = mode === 'more' && result?.reason === 'ok';
    const kept = appending ? result.items.length : 0;
    const params = { styleId: style.id, type, modifiers: mods, request, exclude };
    const keysOf = (r) => (r.items ?? []).map((i) => `${i.type}:${i.tmdb_id}`);
    const show = (next, phase) => {
      if (appending) {
        setResult((prev) => ({
          ...prev,
          ...(phase === 'ai' ? { source: next.source, provider: next.provider, fallbackReason: next.fallbackReason, provisional: false } : {}),
          items: [...prev.items.slice(0, kept), ...(next.items ?? [])],
        }));
      } else {
        setResult(next);
      }
      setShownKeys((prev) => [...new Set([...(mode === 'new' && phase === 'fast' ? [] : prev), ...exclude, ...keysOf(next)])]);
    };

    let first;
    try {
      first = unwrap(await window.electronAPI.generateDiscoverList(params, { refresh: mode !== 'new', fast: true }));
      if (id !== listRequest.current) return;
      if (appending && keysOf(first).length === 0) {
        showToast({ message: 'No encontramos más títulos con esa combinación. Prueba otro estilo o quita algún ajuste.' });
        return;
      }
      show(first, 'fast');
    } catch (err) {
      if (id === listRequest.current) setGenError(err.message);
      return;
    } finally {
      if (id === listRequest.current) setBusy(null);
    }
    if (!first.aiAvailable || first.reason !== 'ok') return;

    setRefining(true);
    try {
      const better = unwrap(await window.electronAPI.generateDiscoverList(params, { refresh: mode !== 'new' }));
      if (id !== listRequest.current) return;
      if (better.reason === 'ok' && better.source === 'ai') show(better, 'ai');
      else setResult((prev) => ({ ...prev, provisional: false, provider: better.provider, fallbackReason: better.fallbackReason ?? 'empty-ai-response' }));
    } catch {
      if (id === listRequest.current) setResult((prev) => ({ ...prev, provisional: false, fallbackReason: 'api-error' }));
    } finally {
      if (id === listRequest.current) setRefining(false);
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

  async function dismissOne(item) {
    const index = result.items.findIndex((i) => i.tmdb_id === item.tmdb_id && i.type === item.type);
    try {
      unwrap(await window.electronAPI.dismissTitle({ tmdb_id: item.tmdb_id, type: item.type, title: item.title }));
    } catch (err) {
      showToast({ message: err.message, type: 'error' });
      return;
    }
    setResult((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    showToast({
      message: `No volveremos a sugerirte "${item.title}".`,
      action: {
        label: 'Deshacer',
        onClick: async () => {
          await window.electronAPI.undismissTitle(item.tmdb_id, item.type);
          setResult((prev) => {
            if (!prev || prev.items.some((i) => i.tmdb_id === item.tmdb_id)) return prev;
            const items = [...prev.items];
            items.splice(Math.min(index, items.length), 0, item);
            return { ...prev, items };
          });
        },
      },
    });
  }

  async function saveList() {
    setSaving(true);
    try {
      const { list, added } = unwrap(await window.electronAPI.saveDiscoverList({
        name: result.name,
        intro: result.intro,
        items: result.items.map((i) => ({ tmdb_id: i.tmdb_id, type: i.type, reason: i.reason })),
      }));
      const all = await window.electronAPI.getAllTitles({});
      if (!all?.error) setCatalog(all);
      showToast({
        message: added > 0
          ? `Se guardó "${list.name}" y ${added} ${added === 1 ? 'título nuevo quedó' : 'títulos nuevos quedaron'} como pendientes.`
          : `Se guardó "${list.name}".`,
        action: { label: 'Ver lista', onClick: () => navigate(`/lists/${list.id}`) },
      });
    } catch (err) {
      showToast({ message: `No se pudo guardar la lista: ${err.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <main className="page">
        <h1 className="page__heading">Descubrir</h1>
        <GuestPrompt title="Descubre según tu gusto" message="Inicia sesión: las listas se arman con los títulos que calificaste." />
      </main>
    );
  }

  const openTitle = (id) => navigate(`/title/${id}`);
  const styles = data?.styles ?? [];
  const modifiers = (data?.modifiers ?? []).filter((m) => m.available);

  return (
    <main className="page discover">
      <header className="page__header">
        <h1 className="page__heading">Descubrir</h1>
      </header>

      {error && <PageError message={`No se pudo cargar Descubrir: ${error}`} onRetry={() => setReloadKey((k) => k + 1)} />}

      {!error && (
        <TonightPicker catalogIds={catalogIds} addingId={addingId} onAdd={addOne} onOpen={openTitle} platforms={platforms.length} />
      )}

      {!error && (
        <section className="rail discover__section" aria-labelledby="lists-title">
          <header className="rail__header">
            <h2 className="rail__title" id="lists-title">Listas para ti</h2>
            <span className="rail__tag">Títulos que aún no tienes</span>
          </header>

          {loading && <div className="style-board" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="style-slab skeleton" />)}</div>}

          {!loading && styles.length === 0 && (
            <div className="catalog__empty" role="status">
              <h3 className="catalog__empty-title">Aún no conocemos tu gusto</h3>
              <p>Marca como vistos y califica al menos dos títulos. Con eso armamos listas de películas y series que encajan contigo y te explicamos por qué.</p>
              <Link className="btn btn--primary btn--lg" to="/catalog">Ir al catálogo</Link>
            </div>
          )}

          {!loading && styles.length > 0 && (
            <>
              <StyleBoard styles={styles} value={styleId} onChange={pickStyle} />

              {style?.seedTitles?.length > 0 && (
                <p className="discover__seeds">A partir de {style.seedTitles.slice(0, 4).map((t) => `“${t}”`).join(', ')}</p>
              )}

              <div className="discover-controls">
                <div className="segmented segmented--page" role="radiogroup" aria-label="Tipo">
                  {TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      role="radio"
                      aria-checked={type === t.value}
                      className={`segmented__option${type === t.value ? ' is-active' : ''}`}
                      onClick={() => setType(t.value)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="discover-controls__mods" role="group" aria-label="Ajustes de la lista">
                  {modifiers.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`chip${mods.includes(m.id) ? ' chip--active' : ''}`}
                      aria-pressed={mods.includes(m.id)}
                      onClick={() => toggleMod(m.id)}
                    >
                      {m.label}
                    </button>
                  ))}
                  {platforms.length === 0 && (
                    <Link className="discover-controls__hint" to="/profile">Elige tus plataformas para filtrar por ellas</Link>
                  )}
                </div>

                <form className="discover-controls__request" onSubmit={(e) => { e.preventDefault(); generate(); }}>
                  <label htmlFor="discover-request" className="sr-only">Afina la lista con tus palabras</label>
                  <input
                    id="discover-request"
                    value={request}
                    maxLength={300}
                    onChange={(e) => setRequest(e.target.value)}
                    placeholder="Afínala con tus palabras (opcional): con giros, coreanas, de los 80, como Seven…"
                  />
                </form>

                <button className="btn btn--primary btn--lg discover-controls__go" onClick={() => generate()} disabled={busy !== null || !style}>
                  {busy === 'generate' && <IconSpinner />}
                  {busy === 'generate' ? 'Armando…' : 'Armar lista'}
                </button>
              </div>

              {genError && <p className="form-error" role="alert">No se pudo armar la lista: {genError}</p>}

              {busy === 'generate' && !result && (
                <div className="rail__empty" role="status">Buscando en TMDB títulos de {style?.label.toLowerCase()} que aún no tienes y eligiendo los que mejor te encajan…</div>
              )}

              {!result && busy === null && !genError && (
                <div className="rail__empty">Elige un estilo, ajústalo si quieres y arma tu lista. Cada título trae el motivo por el que te puede gustar.</div>
              )}

              {result?.reason === 'no-candidates' && (
                <div className="rail__empty" role="status">No encontramos títulos nuevos con esa combinación. Quita algún ajuste o prueba con {result.type === 'movie' ? 'series' : 'películas'}.</div>
              )}

              {result?.reason === 'ok' && (
                <GeneratedList
                  key={`${result.style.id}-${result.type}-${result.generatedAt}`}
                  result={result}
                  catalogIds={catalogIds}
                  addingId={addingId}
                  saving={saving}
                  busy={busy}
                  refining={refining}
                  onAdd={addOne}
                  onDismiss={dismissOne}
                  onSave={saveList}
                  onRegenerate={() => generate('refresh')}
                  onMore={() => generate('more')}
                  onTrailer={(item) => setTrailer({ tmdbId: item.tmdb_id, type: item.type, title: item.title })}
                  onOpen={openTitle}
                />
              )}
            </>
          )}
        </section>
      )}

      {!error && <DescribeSearch catalogIds={catalogIds} addingId={addingId} onAdd={addOne} onOpen={openTitle} />}

      <TrailerModal
        open={trailer !== null}
        onClose={() => setTrailer(null)}
        tmdbId={trailer?.tmdbId}
        type={trailer?.type}
        title={trailer?.title ?? ''}
      />
    </main>
  );
}
