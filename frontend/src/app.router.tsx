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
          {
            path: "proveedores",
            async lazy() {
              const { SupplierPage } = await import("./supplier/pages/supplier.page");
              return { Component: SupplierPage };
            },
          },
          {
            path: "productos",
            async lazy() {
              const { ProductsPage } = await import("./inventory/pages/inventory.pages");
              return { Component: ProductsPage };
            },
          },
          {
            path: "vinos",
            async lazy() {
              const { WinePage } = await import("./wines/pages/wines.page");
              return { Component: WinePage };
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