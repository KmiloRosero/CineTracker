import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import YouTubePlayer from './YouTubePlayer';
import { IconClose, IconExternal, IconSpinner } from './Icons';

const LANGUAGE = { es: 'En español', en: 'En inglés' };
const KIND     = { Trailer: 'Tráiler', Teaser: 'Avance' };

/**
 * The title's trailer on an on-air screen: looks it up on TMDB when opened
 * and plays it with YouTubePlayer. Closing unmounts the player, which stops it.
 */
export default function TrailerModal({ open, onClose, tmdbId, type, title }) {
  const [state, setState] = useState({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) { setState({ status: 'idle' }); return undefined; }
    let cancelled = false;
    setState({ status: 'loading' });
    window.electronAPI.tmdbGetTrailer(tmdbId, type)
      .then((result) => {
        if (cancelled) return;
        if (result?.error) setState({ status: 'error', message: result.error });
        else if (!result) setState({ status: 'none' });
        else setState({ status: 'ready', trailer: result });
      })
      .catch((err) => { if (!cancelled) setState({ status: 'error', message: err.message }); });
    return () => { cancelled = true; };
  }, [open, tmdbId, type, attempt]);

  const trailer = state.trailer;

  return (
    <Modal open={open} onClose={onClose} label={`Tráiler de ${title}`} className="trailer-modal">
      <header className="trailer__header">
        <div className="lower-third">
          <span className="lower-third__label"><span>{KIND[trailer?.type] ?? 'Tráiler'}</span></span>
          <span className="lower-third__meta"><span>{title}</span></span>
        </div>
        <button className="modal__close trailer__close" onClick={onClose} aria-label="Cerrar tráiler">
          <IconClose size={16} />
        </button>
      </header>

      <div className="trailer__screen">
        {state.status === 'loading' && (
          <div className="yt-player yt-player--empty" role="status">
            <p className="yt-player__message"><IconSpinner /> Buscando el tráiler…</p>
          </div>
        )}
        {state.status === 'none' && (
          <div className="yt-player yt-player--empty" role="status">
            <p className="yt-player__message">TMDB todavía no tiene un tráiler para este título.</p>
          </div>
        )}
        {state.status === 'error' && (
          <div className="yt-player yt-player--empty" role="alert">
            <p className="yt-player__message">No se pudo cargar el tráiler. {state.message}</p>
            <button className="btn btn--ghost btn--sm trailer__retry" onClick={() => setAttempt((n) => n + 1)}>Reintentar</button>
          </div>
        )}
        {state.status === 'ready' && (
          <YouTubePlayer videoId={trailer.key} title={`${trailer.name || 'Tráiler'}: ${title}`} autoplay />
        )}
      </div>

      {state.status === 'ready' && (
        <footer className="trailer__footer">
          <p className="trailer__name">
            <span>{trailer.name}</span>
            {LANGUAGE[trailer.language] && <span className="trailer__lang">{LANGUAGE[trailer.language]}</span>}
          </p>
          <button className="btn btn--ghost btn--sm" onClick={() => window.electronAPI.openYouTube(trailer.key)}>
            Ver en YouTube <IconExternal size={14} />
          </button>
        </footer>
      )}
    </Modal>
  );
}
