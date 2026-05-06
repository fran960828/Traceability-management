import { createBrowserRouter } from "react-router-dom";
//import { RootLayout } from "../components/Layout/RootLayout";
//import { ProtectedRoute } from "./shared/router";
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
  //{
  //  path: "/",
  //  element: <ProtectedRoute />, // Guardián de seguridad
  //  children: [
  //    {
  //      element: <RootLayout />, // Tu Layout con Navbar y Logout
  //      children: [
  //        {
  //          index: true,
  //          element: <Navigate to="/dashboard" replace />,
  //        },
  //        {
  //          path: "dashboard",
  //          async lazy() {
  //            const { DashboardPage } = await import("../../../modules/dashboard/pages/DashboardPage");
  //            return { Component: DashboardPage };
  //          },
  //        },
  //        {
  //          path: "barricas",
  //          async lazy() {
  //            // Ejemplo de lo que haremos más adelante
  //            const { BarricasPage } = await import("../../../modules/inventory/pages/BarricasPage");
  //            return { Component: BarricasPage };
  //          },
  //        },
  //      ],
  //    },
  //  ],
  //},
  //
  //// 404 - Ruta de escape
  //{
  //  path: "*",
  //  element: <Navigate to="/dashboard" replace />,
  //},
]);