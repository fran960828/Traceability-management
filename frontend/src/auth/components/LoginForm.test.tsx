import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginForm } from './LoginForm';
import { useLogin } from '../hooks/useLogin';

// Mock del hook useLogin
vi.mock('../hooks/useLogin', () => ({
  useLogin: vi.fn(),
}));

describe('LoginForm Component', () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Configuración por defecto del mock del hook
    (useLogin as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
    });
  });

  it('debería renderizar todos los elementos básicos del formulario', () => {
    render(<LoginForm />);
    
    expect(screen.getByText(/Bodega Ontalba/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /INICIAR SESIÓN/i })).toBeInTheDocument();
  });

  it('debería mostrar mensajes de validación si los campos están vacíos al hacer submit', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const submitBtn = screen.getByRole('button', { name: /INICIAR SESIÓN/i });
    await user.click(submitBtn);

    // Zod disparará los errores
    expect(await screen.findByText(/El usuario es obligatorio/i)).toBeInTheDocument();
    expect(await screen.findByText(/La contraseña debe tener al menos 8 caracteres/i)).toBeInTheDocument();
    
    // No debería llamarse al login si hay errores de validación
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('debería mostrar errores específicos de fortaleza de contraseña', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const passwordInput = screen.getByLabelText(/Contraseña/i);
    
    // Test: Falta mayúscula y número
    await user.type(passwordInput, 'abc12345!'); 
    await user.click(screen.getByRole('button', { name: /INICIAR SESIÓN/i }));

    expect(await screen.findByText(/Debe contener al menos una mayúscula/i)).toBeInTheDocument();
  });

  it('debería alternar la visibilidad de la contraseña al pulsar el ojo', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const passwordInput = screen.getByLabelText(/Contraseña/i);
    const toggleBtn = screen.getByRole('button', { name: /👁️|🙈/ });

    // Por defecto es password
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Primer click -> texto visible
    await user.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');

    // Segundo click -> ocultar
    await user.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('debería deshabilitar el botón y mostrar texto de carga cuando isPending es true', () => {
    (useLogin as any).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
      isError: false,
      error: null,
    });

    render(<LoginForm />);

    const submitBtn = screen.getByRole('button', { name: /AUTENTICANDO.../i });
    expect(submitBtn).toBeDisabled();
  });

  it('debería llamar a la función login con datos válidos', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const userInput = screen.getByLabelText(/Usuario/i);
    const passwordInput = screen.getByLabelText(/Contraseña/i);
    const submitBtn = screen.getByRole('button', { name: /INICIAR SESIÓN/i });

    // Llenamos el formulario con datos que cumplen el esquema de Zod
    await user.type(userInput, 'enologo_juan');
    await user.type(passwordInput, 'Vesta_2026!');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        username: 'enologo_juan',
        password: 'Vesta_2026!',
      });
    });
  });

  it('debería mostrar el error de la API si el login falla', () => {
    const apiErrorMessage = 'Credenciales inválidas para Ontalba';
    (useLogin as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: true,
      error: { response: { data: { detail: apiErrorMessage } } },
    });

    render(<LoginForm />);

    expect(screen.getByText(apiErrorMessage)).toBeInTheDocument();
  });
});