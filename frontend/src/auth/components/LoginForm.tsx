import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLogin } from '../hooks/useLogin';
import { type LoginCredentials, loginFormSchema } from '../models';
import styles from './LoginForm.module.css';
import { FormInput } from '../../shared/components/formularios/formInput';



export const LoginForm: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false)
  const { mutate: login, isPending, isError, error } = useLogin();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginFormSchema),
  });

  const onSubmit = (data: LoginCredentials) => {
    login(data);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logoArea}>
          {/* Aquí iría tu SVG o imagen de logo */}
          <h1>Bodega Ontalba</h1>
          <p>Gestión de Embotellado</p>
        </div>

        {isError && (
          <div className={styles.apiError}>
            {error?.response?.data?.detail || 'Error al conectar con la bodega'}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <FormInput
            label="Usuario"
            placeholder="ej. enologo_juan"
            register={register('username')}
            error={errors.username?.message}
          />

          <FormInput
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            register={register('password')}
            error={errors.password?.message}
          >
            {/* Pasamos el ojo como "children" para que se posicione dentro */}
            <button
              type="button"
              className={styles.eyeButton}
              onClick={togglePasswordVisibility}
              tabIndex={-1}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </FormInput>

          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isPending}
          >
            {isPending ? 'AUTENTICANDO...' : 'INICIAR SESIÓN'}
          </button>
        </form>
      </div>
    </div>
  );
};