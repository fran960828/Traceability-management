import { createContext, useReducer, type ReactNode, useEffect, useMemo } from 'react';
import { UserSchema } from '../../shared/models/auth.schema';
import { TokenStorage } from '../../shared/services/TokenStorage';
import type { AuthAction, AuthState } from '../models';

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  isInitialized: false,
};

// 3. Reducer: Lógica pura de transición de estados
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, isAuthenticated: true, user: action.payload };
    case 'LOGOUT':
      return { ...state, isAuthenticated: false, user: null };
    case 'INITIALIZE':
      return { isInitialized: true, isAuthenticated: !!action.payload, user: action.payload };
    default:
      return state;
  }
};

// 4. El Contexto
export const AuthContext = createContext<{
  state: AuthState;
  dispatch: React.Dispatch<AuthAction>;
} | null>(null);

// 5. El Provider
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Efecto de Hidratación: Se ejecuta al cargar la app
  useEffect(() => {
    const initAuth = () => {
      const token = TokenStorage.getAccessToken();
      if (token) {
        try {
          // Aquí podrías usar TokenStorage.decodeToken(token) 
          // y validarlo con UserSchema.parse()

          const userData = TokenStorage.getUser(); 
          const validatedUser = UserSchema.parse(userData);
          dispatch({ type: 'INITIALIZE', payload: validatedUser });
        } catch (error) {
          TokenStorage.clear();
          dispatch({ type: 'INITIALIZE', payload: null });
        }
      } else {
        dispatch({ type: 'INITIALIZE', payload: null });
      }
    };

    initAuth();
  }, []);

  // Memorizamos el valor para evitar re-renders innecesarios
  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <AuthContext.Provider value={value}>
      {/* No renderizamos la app hasta que sepamos si el usuario está logueado o no */}
      {state.isInitialized ? children : <div>Cargando bodega...</div>}
    </AuthContext.Provider>
  );
};