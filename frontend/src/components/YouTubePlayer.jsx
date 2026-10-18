import React, { useEffect, useState } from 'react';

// YouTube ids are 11 characters of [A-Za-z0-9_-]; anything else is never embedded.
export const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Embed URL on YouTube's privacy-enhanced domain (no cookies until playback),
 * with related videos limited to the same channel and Spanish UI and captions.
 */
export function youTubeEmbedUrl(videoId, { autoplay = false, start } = {}) {
  const params = new URLSearchParams({
    rel: '0',
    playsinline: '1',
    iv_load_policy: '3',
    hl: 'es',
    cc_lang_pref: 'es',
  });
  if (autoplay) params.set('autoplay', '1');
  if (Number.isFinite(start) && start > 0) params.set('start', String(Math.floor(start)));
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
}

/**
 * Reusable YouTube player: a 16:9 broadcast screen that shows a loading frame
 * until the embed is ready. `title` names the frame for screen readers.
 * The only page the app's CSP lets into a frame is this embed.
 */
export default function YouTubePlayer({ videoId, title, autoplay = false, start, className = '' }) {
  const [loaded, setLoaded] = useState(false);
  const valid = typeof videoId === 'string' && YOUTUBE_ID.test(videoId);

  useEffect(() => { setLoaded(false); }, [videoId]);

  if (!valid) {
    return (
      <div className={`yt-player yt-player--empty ${className}`} role="status">
        <p className="yt-player__message">Este video no se puede reproducir.</p>
      </div>
    );
  }

  return (
    <div className={`yt-player${loaded ? ' is-loaded' : ''} ${className}`} aria-busy={!loaded}>
      {!loaded && <div className="yt-player__loading" aria-hidden="true"><span className="yt-player__bar" /></div>}
      <iframe
        key={videoId}
        className="yt-player__frame"
        src={youTubeEmbedUrl(videoId, { autoplay, start })}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
