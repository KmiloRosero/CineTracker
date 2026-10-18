import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import YouTubePlayer, { youTubeEmbedUrl } from './YouTubePlayer';

afterEach(cleanup);

describe('YouTubePlayer', () => {
  it('embeds the video from the privacy-enhanced domain in a sandboxed, titled frame', () => {
    const { container } = render(<YouTubePlayer videoId="v0rgfN2MCys" title="Tráiler oficial: VisionQuest" autoplay />);
    const frame = screen.getByTitle('Tráiler oficial: VisionQuest');
    const src = new URL(frame.getAttribute('src'));
    expect(src.origin).toBe('https://www.youtube-nocookie.com');
    expect(src.pathname).toBe('/embed/v0rgfN2MCys');
    expect(src.searchParams.get('autoplay')).toBe('1');
    expect(src.searchParams.get('hl')).toBe('es');
    expect(frame.getAttribute('sandbox')).toContain('allow-scripts');
    expect(frame.getAttribute('sandbox')).not.toContain('allow-top-navigation');
    expect(frame.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin');
    // a loading strip shows until the embed reports it is ready
    expect(container.querySelector('.yt-player__loading')).not.toBeNull();
    fireEvent.load(frame);
    expect(container.querySelector('.yt-player__loading')).toBeNull();
    expect(container.querySelector('.yt-player.is-loaded')).not.toBeNull();
  });

  it('never builds a frame for an id that is not a YouTube id', () => {
    for (const bad of ['', 'short', 'javascript:alert(1)', '../../evil00', null]) {
      cleanup();
      render(<YouTubePlayer videoId={bad} title="x" />);
      expect(document.querySelector('iframe')).toBeNull();
      expect(screen.getByText('Este video no se puede reproducir.')).toBeTruthy();
    }
  });

  it('only adds autoplay and start when asked', () => {
    const plain = new URL(youTubeEmbedUrl('abcdefghijk'));
    expect(plain.searchParams.has('autoplay')).toBe(false);
    expect(plain.searchParams.has('start')).toBe(false);
    expect(new URL(youTubeEmbedUrl('abcdefghijk', { start: 42.7 })).searchParams.get('start')).toBe('42');
  });
});
