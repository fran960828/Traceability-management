import { useContext } from 'react';
import { AuthContext } from '../../auth/context/auth.context';

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth debe ser utilizado dentro de un AuthProvider. ' +
      'Asegúrate de envolver tu aplicación con <AuthProvider> en el archivo principal.'
    );
  }

  return context;
};