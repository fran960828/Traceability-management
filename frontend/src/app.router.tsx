import { createBrowserRouter, Navigate } from "react-router-dom";
import { RootLayout } from "./shared/components/layout/RootLayout";
import { ProtectedRoute } from "./shared/router";
import { PublicRoute } from "./shared/router";

export const router = createBrowserRouter([
  // --- RUTAS PÚBLICAS (Login, etc.) ---
  {
    element: <PublicRoute />,
    children: [
      {
        path: "/login",
        async lazy() {
          const { LoginPage } = await import("./auth/pages/LoginPage");
          return { Component: LoginPage };
        },
      },
    ],
  },

  // --- RUTAS PRIVADAS (Gestión de Bodega) ---
  {
    path: "/",
    element: <ProtectedRoute />, // Guardián de seguridad
    children: [
      {
        element: <RootLayout />, // Tu Layout con Navbar y Logout
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: "dashboard",
            async lazy() {
              const { DashboardPage } = await import("./dashboard/pages/DashboardPage");
              return { Component: DashboardPage };
            },
          },
        ],
      },
    ],
  },
  
  // 404 - Ruta de escape
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);