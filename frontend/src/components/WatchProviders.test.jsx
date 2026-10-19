import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import WatchProviders from './WatchProviders';

afterEach(() => { cleanup(); delete window.electronAPI; });

const title = { tmdb_id: 438631, type: 'movie', title: 'Duna' };

describe('WatchProviders', () => {
  it('groups legal providers and opens their link', async () => {
    window.electronAPI = {
      tmdbGetWatchProviders: vi.fn().mockResolvedValue({
        region: 'CO',
        link: 'https://www.themoviedb.org/movie/438631/watch?locale=CO',
        groups: {
          flatrate: [{ id: 8, name: 'Netflix', logo_path: null, url: 'https://www.netflix.com/search?q=Duna' }],
          free: [],
          rent: [{ id: 2, name: 'Apple TV Store', logo_path: null, url: 'https://tv.apple.com/search?term=Duna' }],
          buy: [],
        },
      }),
      openWatchLink: vi.fn(),
    };
    render(<WatchProviders title={title} />);
    expect(await screen.findByText('Incluida en suscripción')).toBeTruthy();
    expect(screen.getByText('Alquiler')).toBeTruthy();
    expect(screen.queryByText('Compra')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Ver en Netflix/ }));
    expect(window.electronAPI.openWatchLink).toHaveBeenCalledWith('https://www.netflix.com/search?q=Duna');
    fireEvent.click(screen.getByRole('button', { name: /Ver todas las opciones/ }));
    expect(window.electronAPI.openWatchLink).toHaveBeenLastCalledWith('https://www.themoviedb.org/movie/438631/watch?locale=CO');
    expect(window.electronAPI.tmdbGetWatchProviders).toHaveBeenCalledWith(438631, 'movie', 'Duna');
  });

  it('says when nothing is offered in Colombia', async () => {
    window.electronAPI = {
      tmdbGetWatchProviders: vi.fn().mockResolvedValue({ region: 'CO', link: null, groups: { flatrate: [], free: [], rent: [], buy: [] } }),
    };
    render(<WatchProviders title={title} />);
    expect(await screen.findByText('Por ahora no está en plataformas de streaming en Colombia.')).toBeTruthy();
  });
});
