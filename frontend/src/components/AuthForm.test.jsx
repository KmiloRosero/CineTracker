import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import AuthForm from './AuthForm';
import { AuthProvider } from '../context/AuthContext';

afterEach(() => { cleanup(); delete window.electronAPI; });

function setup() {
  window.electronAPI = {
    getCurrentUser: vi.fn().mockResolvedValue(null),
    login: vi.fn().mockResolvedValue({ id: 1, name: 'Camilo', email: 'c@test.co' }),
    register: vi.fn().mockResolvedValue({ id: 2, name: 'Ana', email: 'a@test.co' }),
  };
  const onSuccess = vi.fn();
  render(<AuthProvider><AuthForm onSuccess={onSuccess} idPrefix="t" /></AuthProvider>);
  return { api: window.electronAPI, onSuccess };
}

const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('AuthForm', () => {
  it('validates in Spanish before calling the backend', async () => {
    const { api } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByText('Escribe tu correo.')).toBeTruthy();
    expect(screen.getByText('Escribe tu contraseña.')).toBeTruthy();
    type('Correo', 'no-es-correo');
    fireEvent.blur(screen.getByLabelText('Correo'));
    expect(await screen.findByText('Escribe un correo válido, como tu@ejemplo.com.')).toBeTruthy();
    expect(api.login).not.toHaveBeenCalled();
  });

  it('logs in remembering the session by default', async () => {
    const { api, onSuccess } = setup();
    expect(screen.getByLabelText('Mantener la sesión iniciada en este equipo').checked).toBe(true);
    type('Correo', ' camilo@test.co ');
    type('Contraseña', 'secret123');
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(api.login).toHaveBeenCalledWith('camilo@test.co', 'secret123', true);
  });

  it('registers without remembering when unchecked and shows backend errors', async () => {
    const { api } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Crea una cuenta' }));
    type('Nombre', 'Ana');
    type('Correo', 'ana@test.co');
    type('Contraseña', '123');
    type('Repite la contraseña', '124');
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText('Usa al menos 6 caracteres.')).toBeTruthy();
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy();

    type('Contraseña', 'secret123');
    type('Repite la contraseña', 'secret123');
    fireEvent.click(screen.getByLabelText('Mantener la sesión iniciada en este equipo'));
    api.register.mockResolvedValueOnce({ error: 'Ya existe una cuenta con ese correo.' });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText('Ya existe una cuenta con ese correo.')).toBeTruthy();
    expect(api.register).toHaveBeenCalledWith('Ana', 'ana@test.co', 'secret123', false);
  });
});
