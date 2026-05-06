import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from "./";
import { useAuth } from '../../shared/hooks';
import { TokenStorage } from '../../shared/services/TokenStorage';
import { ROLES } from '../../shared/models/';

// Componente de prueba para consumir el hook
const TestComponent = () => {
  const { state } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{state.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</span>
      <span data-testid="user-role">{state.user?.role || 'No Role'}</span>
      <span data-testid="initialized">{state.isInitialized ? 'Yes' : 'No'}</span>
    </div>
  );
};

vi.mock('../../shared/services/TokenStorage', () => ({
  TokenStorage: {
    getAccessToken: vi.fn(),
    getUser: vi.fn(),
    clear: vi.fn(),
  },
}));

describe('AuthContext & AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- HAPPY PATH ---
  it('debería inicializar como autenticado si hay un token y usuario válidos', async () => {
    const mockUser = { username: 'enologo1', role: ROLES.ENOLOGO };
    (TokenStorage.getAccessToken as any).mockReturnValue('valid-token');
    (TokenStorage.getUser as any).mockReturnValue(mockUser);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Esperamos a que pase el estado de "Cargando bodega..."
    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');
    });
    expect(screen.getByTestId('user-role').textContent).toBe(ROLES.ENOLOGO);
  });

  // --- EDGE CASES ---
  it('debería inicializar como NO autenticado si no hay token', async () => {
    (TokenStorage.getAccessToken as any).mockReturnValue(null);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('Not Authenticated');
    });
    expect(screen.getByTestId('initialized').textContent).toBe('Yes');
  });

  it('debería limpiar el storage e inicializar como NO autenticado si los datos son corruptos (Fallo de Zod)', async () => {
    (TokenStorage.getAccessToken as any).mockReturnValue('valid-token');
    // Simulamos datos corruptos (rol inexistente) que harán saltar a Zod
    (TokenStorage.getUser as any).mockReturnValue({ username: 'hacker', role: 'PIRATA' });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('Not Authenticated');
    });
    // Verificamos que se llamó a la limpieza por seguridad
    expect(TokenStorage.clear).toHaveBeenCalled();
  });

  it('debería lanzar un error si useAuth se usa fuera del AuthProvider', () => {
    // Silenciamos el error de consola esperado para este test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => render(<TestComponent />)).toThrow('useAuth debe ser utilizado dentro de un AuthProvider');
    
    consoleSpy.mockRestore();
  });
});