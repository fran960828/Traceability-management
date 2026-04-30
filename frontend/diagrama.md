Como arquitecto, mi prioridad es que el sistema sea **predecible, testeable y fácil de mantener**. No empezamos pintando botones; empezamos construyendo los cimientos para que, cuando lleguen los datos del backend, todo encaje como un puzzle.

Aquí tienes el diagrama de flujo estratégico para construir tu Frontend modular desde cero:

### 1. Fase de Cimientos (Shared & Core)
Antes de tocar el negocio (la bodega), preparamos la infraestructura común.
* **Definición de Contratos (Interfaces Globales):** Creamos los modelos de datos que se repiten (Usuario, Errores de API, Formatos de Paginación).
* **Cliente de Comunicación (API/Axios):** Configuramos el "túnel" con el backend, incluyendo la gestión de tokens JWT y la lógica de qué hacer cuando una sesión expira.
* **Utilidades de Almacenamiento (Storage Services):** Creamos los servicios para gestionar `localStorage` o `cookies` de forma centralizada.
* **Sistema de Diseño (Shared UI):** Construimos los componentes "átomos" que no tienen lógica de negocio: botones, inputs, modales y el layout principal.

---

### 2. Fase de Dominio (Módulo de Negocio)
Una vez que el túnel está abierto, atacamos una funcionalidad (ej: Producción). Para cada módulo, seguimos este orden interno:

1.  **Contrato de Datos (Interfaces):** Definimos cómo lucen los objetos de ese módulo según el Backend.
2.  **Lógica de Acceso (Services):** Escribimos las funciones puras que llaman a los endpoints específicos (ej: `getOrders`, `createBatch`).
3.  **Capa de Traducción (Adapters):** Transformamos los datos que vienen del backend (fechas ISO, IDs anidados) en objetos cómodos para React.
4.  **Estado y Caché (Hooks con React Query):** Creamos hooks que gestionan la carga, el error y la memoria caché de esos datos.
5.  **Presentación (Components):** Finalmente, creamos la interfaz que consume esos hooks y los muestra al usuario.

---

### 3. Diagrama de Flujo del Desarrollo



1.  **INFRAESTRUCTURA (Horizontal)**
    * `Axios Config` $\rightarrow$ `Auth Logic` $\rightarrow$ `Shared Components`
2.  **CICLO DE UNA FUNCIONALIDAD (Vertical)**
    * `Definir Interfaces`
    * $\downarrow$
    * `Crear Service (API)`
    * $\downarrow$
    * `Crear Adapter (Limpieza de datos)`
    * $\downarrow$
    * `Crear Custom Hook (React Query)`
    * $\downarrow$
    * `Construir UI (Views/Components)`

---

### 4. ¿Por qué este orden?
* **Independencia:** Si el backend cambia un nombre de campo, solo tocas el **Adapter**.
* **Velocidad de Testeo:** Puedes testear los **Services** y **Adapters** sin necesidad de abrir el navegador o renderizar componentes.
* **Escalabilidad:** Si mañana añades el módulo de "Ventas", ya tienes la infraestructura (paso 1) lista; solo tienes que repetir el ciclo del paso 2.

**¿Te hace sentido empezar por la infraestructura de "Shared" (Interfaces y API Client) o prefieres que definamos primero los estándares de los componentes visuales?**

src/modules/auth/
├── components/          # Componentes de UI internos del módulo
│   ├── LoginForm.tsx    # El formulario de entrada
│   ├── RegisterForm.tsx # (Si lo necesitas)
│   └── index.ts         # Exportaciones públicas de componentes
├── context/             # Estado global de autenticación (React Context)
│   ├── AuthContext.tsx  # Definición del Contexto y Provider
│   └── authReducer.ts   # Lógica de transición de estados (Login/Logout)
├── hooks/               # Lógica de negocio (TanStack Query)
│   ├── useLogin.ts      # Hook para manejar la mutación del login
│   └── useLogout.ts     # Hook para manejar el cierre de sesión
├── models/              # Contratos de datos privados del módulo
│   └── login.schema.ts  # Esquema Zod de LoginCredentials
├── pages/               # Componentes de página (lo que ve el Router)
│   ├── LoginPage.tsx    # Página que envuelve al LoginForm
│   └── RegisterPage.tsx
└── services/            # Comunicación con la API
    └── auth.service.ts  # Llamadas físicas al backend usando el apiClient