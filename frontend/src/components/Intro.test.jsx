import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Intro from './Intro';

// WebGL is not available in jsdom; the shader is decorative here.
vi.mock('@/components/ui/liquid-metal-shader', () => ({ default: () => null }));

beforeEach(() => { window.electronAPI = { tmdbGetTrending: vi.fn().mockResolvedValue([]) }; });
afterEach(() => { cleanup(); delete window.electronAPI; });

describe('Intro', () => {
  it('walks the four steps with buttons and keys, then enters', async () => {
    const onDone = vi.fn();
    render(<Intro onDone={onDone} />);
    expect(screen.getByRole('heading', { name: 'Tu cine, narrado como un partido' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Atrás/ }).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    expect(await screen.findByRole('heading', { name: 'Arma tu catálogo en segundos' })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(await screen.findByRole('heading', { name: 'Todo sobre lo que vas a ver' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Paso 4: Para ti' }));
    expect(screen.getByRole('button', { name: /Entrar a CineTracker/ })).toBeTruthy();

    fireEvent.click(screen.getByLabelText('No mostrar al abrir la app'));
    fireEvent.click(screen.getByRole('button', { name: /Entrar a CineTracker/ }));
    expect(onDone).toHaveBeenCalledWith({ dontShow: true });
  });

  it('can be skipped at any step, also with Escape', () => {
    const onDone = vi.fn();
    render(<Intro onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'Saltar presentación' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDone).toHaveBeenCalledTimes(2);
    expect(onDone).toHaveBeenLastCalledWith({ dontShow: false });
  });
});
