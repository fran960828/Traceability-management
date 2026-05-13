/* src/shared/components/Layout/RootLayout/RootLayout.tsx */

import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLogout } from '../../../auth/hooks/useLogout';
import { 
  Menu, X, PanelLeftClose, PanelLeftOpen,
  PackageSearch,Wine,ShoppingCart,Warehouse,ClipboardCheck,ArrowLeftRight,Calculator,SearchCode ,Users, LogOut
} from 'lucide-react';
import styles from './RootLayout.module.css';

// Configuración del menú para evitar repetición de código
const menuConfig = [
  {
    title: 'CONFIGURACIÓN Y ENTIDADES',
    links: [
      { to: '/proveedores', label: 'Proveedores', icon: Users },
      { to: '/productos', label: 'Catálogo de Productos', icon: PackageSearch }, // Labels, Packaging, Enological
      { to: '/vinos', label: 'Fichas de Vinos', icon: Wine }, // Definición de materiales por vino
    ],
  },
  {
    title: 'GESTIÓN OPERATIVA',
    links: [
      { to: '/compras', label: 'Órdenes de Compra', icon: ShoppingCart },
      { to: '/stock', label: 'Inventario / Recepción', icon: Warehouse }, // Recepción con lotes
      { to: '/embotellado', label: 'Registro Embotellado', icon: ClipboardCheck }, // El corazón del proceso
    ],
  },
  {
    title: 'TRAZABILIDAD Y COSTES',
    links: [
      { to: '/movimientos', label: 'Movimientos de Stock', icon: ArrowLeftRight },
      { to: '/escandallos', label: 'Escandallos / Costes', icon: Calculator },
      { to: '/trazabilidad', label: 'Libro de Trazabilidad', icon: SearchCode },
    ],
  },
];

export const RootLayout = () => {
  // Estado para colapsar en Desktop
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Estado para abrir menú hamburguesa en Móvil
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  const { state } = useAuth();
  const { logout } = useLogout();
  const location = useLocation();

  // Función para obtener el título basado en la ruta (simple para ahora)
  const getPageTitle = () => {
    const path = location.pathname.split('/')[1] || 'dashboard';
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  const { user } = state;

  return (
    <div className={`${styles.layout} ${isCollapsed ? styles.collapsed : ''}`}>
      {/* 1. TOP NAVBAR */}
      <header className={styles.navbar}>
        <div className={styles.navLeft}>
          {/* Botón hamburguesa (solo móvil) */}
          <button className={styles.menuBtn} onClick={() => setIsMobileOpen(true)}>
            <Menu size={24} />
          </button>
          <span className={styles.pageTitle}>{getPageTitle()}</span>
        </div>
        
        <div className={styles.navRight}>
          <div className={styles.userProfile}>
            <div>
              <span className={styles.userName}>{user?.username}</span>
              <span className={styles.userRole}>{user?.role}</span>
            </div>
          </div>
          <button onClick={logout} className={styles.logoutBtn}>
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* 2. SIDEBAR (Overlay en móvil, Grid item en desktop) */}
      <aside className={`${styles.sidebar} ${isMobileOpen ? styles.mobileOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <NavLink to="/dashboard" className={styles.brandLink}>
            <div className={styles.brandLogo}>OA</div> 
            {!isCollapsed && (
              <div className={styles.brandText}>
                <span className={styles.brandMain}>ONTALBA</span>
                <span className={styles.brandSub}>BODEGA</span>
              </div>
            )}
          </NavLink>
          {/* Botón de colapso en Desktop / Cerrar en Móvil */}
          <button 
            className={styles.toggleBtn} 
            onClick={() => isMobileOpen ? setIsMobileOpen(false) : setIsCollapsed(!isCollapsed)}
          >
            {isMobileOpen ? <X size={24} /> : (isCollapsed ? <PanelLeftOpen size={22} /> : <PanelLeftClose size={22} />)}
          </button>
        </div>

        <nav className={styles.navMenu}>
          {menuConfig.map((section, idx) => (
            <div key={idx}>
              <p className={styles.sectionTitle}>
                <span>{section.title}</span>
              </p>
              {section.links.map(link => (
                <NavLink 
                  key={link.to} 
                  to={link.to} 
                  className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                  onClick={() => setIsMobileOpen(false)} // Cerrar al hacer clic en móvil
                >
                  <link.icon size={22} />
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* 3. OVERLAY MÓVIL (para cerrar al hacer clic fuera) */}
      {isMobileOpen && (
        <div className={styles.overlay} onClick={() => setIsMobileOpen(false)} />
      )}

      {/* 4. CONTENIDO DINÁMICO */}
      <main className={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  );
};