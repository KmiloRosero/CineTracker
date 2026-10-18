import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import TrailerModal from './TrailerModal';

afterEach(() => { cleanup(); delete window.electronAPI; });

function api(trailerResults) {
  const tmdbGetTrailer = vi.fn();
  trailerResults.forEach((r) => tmdbGetTrailer.mockResolvedValueOnce(r));
  window.electronAPI = { tmdbGetTrailer, openYouTube: vi.fn() };
  return window.electronAPI;
}

const renderModal = (props = {}) => render(
  <TrailerModal open onClose={vi.fn()} tmdbId={693134} type="movie" title="Dune: Parte dos" {...props} />,
);

describe('TrailerModal', () => {
  it('looks up the trailer and plays it with its name and language', async () => {
    const electronAPI = api([{ key: 'v0rgfN2MCys', name: 'Tráiler oficial', language: 'es', type: 'Trailer' }]);
    renderModal();
    expect(screen.getByText('Buscando el tráiler…')).toBeTruthy();
    const frame = await screen.findByTitle('Tráiler oficial: Dune: Parte dos');
    expect(frame.getAttribute('src')).toContain('/embed/v0rgfN2MCys');
    expect(electronAPI.tmdbGetTrailer).toHaveBeenCalledWith(693134, 'movie');
    expect(screen.getByText('En español')).toBeTruthy();
    fireEvent.click(screen.getByText('Ver en YouTube'));
    expect(electronAPI.openYouTube).toHaveBeenCalledWith('v0rgfN2MCys');
  });

  it('says so when TMDB has no trailer', async () => {
    api([null]);
    renderModal();
    expect(await screen.findByText('TMDB todavía no tiene un tráiler para este título.')).toBeTruthy();
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('shows the error and retries', async () => {
    const electronAPI = api([{ error: 'No se pudo conectar con TMDB.' }, { key: 'abcdefghijk', name: 'Teaser', language: 'en', type: 'Teaser' }]);
    renderModal();
    expect(await screen.findByText(/No se pudo conectar con TMDB/)).toBeTruthy();
    fireEvent.click(screen.getByText('Reintentar'));
    await waitFor(() => expect(document.querySelector('iframe')).not.toBeNull());
    expect(electronAPI.tmdbGetTrailer).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Avance')).toBeTruthy();
  });

  it('closes from its button and Escape', async () => {
    api([null]);
    const onClose = vi.fn();
    renderModal({ onClose });
    await screen.findByText(/todavía no tiene/);
    fireEvent.click(screen.getByLabelText('Cerrar tráiler'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
