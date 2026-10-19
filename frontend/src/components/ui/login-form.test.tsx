import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SmokeyBackground, LoginForm, type LoginFormProps } from './login-form';

afterEach(cleanup);

const empty = { name: '', email: '', password: '', confirm: '' };

function renderForm(props: Partial<LoginFormProps> = {}) {
  const handlers = {
    onChange: vi.fn(),
    onRememberChange: vi.fn(),
    onSubmit: vi.fn(),
    onModeChange: vi.fn(),
  };
  render(<LoginForm mode="login" values={empty} remember {...handlers} {...props} />);
  return handlers;
}

describe('LoginForm', () => {
  it('labels every field visibly and offers no sign-in the app cannot do', () => {
    renderForm();
    expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeTruthy();
    expect(screen.getByLabelText('Correo').getAttribute('type')).toBe('email');
    expect(screen.getByLabelText('Contraseña').getAttribute('autocomplete')).toBe('current-password');
    expect(screen.queryByLabelText('Nombre')).toBeNull();
    expect(screen.queryByText(/Google/)).toBeNull();
    expect(screen.queryByText(/Olvidaste/i)).toBeNull();
  });

  it('shows the sign-up fields and errors tied to their inputs', () => {
    renderForm({ mode: 'register', errors: { confirm: 'Las contraseñas no coinciden.' } });
    expect(screen.getByLabelText('Nombre')).toBeTruthy();
    const confirm = screen.getByLabelText('Repite la contraseña');
    expect(confirm.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(confirm.getAttribute('aria-describedby') as string)?.textContent).toBe('Las contraseñas no coinciden.');
    expect(screen.getByLabelText('Contraseña').getAttribute('autocomplete')).toBe('new-password');
  });

  it('reports typing, toggles the password, submits and switches mode', () => {
    const h = renderForm({ onClose: vi.fn() });
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'a@b.co' } });
    expect(h.onChange).toHaveBeenCalledWith('email', 'a@b.co');

    const toggle = screen.getByRole('button', { name: 'Mostrar contraseña' });
    fireEvent.click(toggle);
    expect(screen.getByLabelText('Contraseña').getAttribute('type')).toBe('text');
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(h.onSubmit).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Crea una cuenta' }));
    expect(h.onModeChange).toHaveBeenCalledWith('register');
    fireEvent.click(screen.getByLabelText('Mantener la sesión iniciada en este equipo'));
    expect(h.onRememberChange).toHaveBeenCalledWith(false);
  });

  it('marks the busy state on the submit button', () => {
    renderForm({ busy: true });
    const submit = screen.getByRole('button', { name: 'Entrando…' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });
});

describe('SmokeyBackground', () => {
  it('is decorative and keeps its dark ground when WebGL is unavailable', () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const { container } = render(<SmokeyBackground />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.className).toContain('bg-slab-black');
    expect(root.className).toContain('pointer-events-none');
    expect(getContext).toHaveBeenCalledWith('webgl', expect.any(Object));
    getContext.mockRestore();
  });
});
