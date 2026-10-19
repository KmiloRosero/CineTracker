import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Intro from './Intro';

// WebGL is not available in jsdom; the shader is decorative here.
vi.mock('@/components/ui/liquid-metal-shader', () => ({ default: () => null }));

afterEach(cleanup);

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

    fireEvent.click(screen.getByRole('button', { name: /Entrar a CineTracker/ }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('can be skipped at any step, also with Escape', () => {
    const onDone = vi.fn();
    render(<Intro onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'Saltar presentación' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDone).toHaveBeenCalledTimes(2);
  });
});
