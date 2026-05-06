import React from 'react';
import { LoginForm } from '../components/LoginForm';
import styles from './LoginPage.module.css';

export const LoginPage: React.FC = () => {
  return (
    <main className={styles.pageWrapper}>
      <section className={styles.loginSection}>
        <LoginForm />
      </section>
      
      <footer className={styles.footer}>
        <p>© 2026 Bodega Ontalba - Sistema de Gestión de Embotellado</p>
      </footer>
    </main>
  );
};

