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
          {
            path: "almacenes",
            async lazy() {
              const { LocationPage } = await import("./locations/pages/Location.page");
              return { Component: LocationPage };
            },
          },
          {
            path: "compras",
            async lazy() {
              const { PurchasePage } = await import("./purchase/pages/purchase.page");
              return { Component: PurchasePage };
            },
          },
          {
            path: "recepcion",
            async lazy() {
              const { ReceptionPage } = await import("./reception/pages/Reception.page");
              return { Component: ReceptionPage };
            },
          },
          {
            path: "movimientos",
            async lazy() {
              const { StockPage } = await import("./stock/pages/Stock.page");
              return { Component: StockPage };
            },
          },
          {
            path: "embotellado",
            async lazy() {
              const { ProductionRecordPage } = await import("./productionRecord/pages/ProductionRecord.page");
              return { Component: ProductionRecordPage };
            },
          },
          {
            path: "indirectos",
            async lazy() {
              const { IndirectCostPage } = await import("./indirectCost/pages/IndirectCosts.page");
              return { Component: IndirectCostPage};
            },
          },
          {
            path: "trazabilidad",
            async lazy() {
              const { TraceabilityPage } = await import("./traceability/pages/Traceability.page");
              return { Component: TraceabilityPage};
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