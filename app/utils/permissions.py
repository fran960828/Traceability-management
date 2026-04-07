from rest_framework import permissions


class RolePermission(permissions.BasePermission):
    """
    Reglas de Negocio de Ontalba:
    - ENOLOGO: Control total (CRUD).
    - COMERCIAL: Ver, Crear y Editar (No puede borrar).
    - BODEGUERO: Solo ver (Read Only).
    """

    def has_permission(self, request, view):
        # 1. Si no está autenticado, fuera.
        if not request.user or not request.user.is_authenticated:
            return False

        user_role = getattr(request.user, "role", None)

        # --- CASO 1: ENOLOGO (Superusuario de bodega) ---
        if user_role == "ENOLOGO":
            return True

        # --- CASO 2: COMERCIAL (Gestión sin borrado) ---
        if user_role == "COMPRAS":
            # Permitimos todo MENOS el borrado (DELETE)
            return request.method != "DELETE"

        # --- CASO 3: BODEGUERO (Consulta) ---
        if user_role == "BODEGUERO":
            # Solo permitimos métodos SEGUROS (GET, HEAD, OPTIONS)
            return request.method in permissions.SAFE_METHODS

        # Por defecto, si el rol no coincide con nada, denegar
        return False


class PurchaseRolePermission(permissions.BasePermission):
    """
    Permisos específicos para el flujo de Compras:
    - ENOLOGO: Control total.
    - COMPRAS: CRUD (Menos borrar).
    - BODEGUERO: Ver + Confirmar Recepción (PATCH de estado/cantidad).
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        user_role = getattr(request.user, "role", None)

        # --- ENOLOGO: Dios en la bodega ---
        if user_role == "ENOLOGO":
            return True

        # --- COMPRAS: Gestión comercial ---
        if user_role == "COMPRAS":
            return True

        # --- BODEGUERO: El receptor de mercancía ---
        if user_role == "BODEGUERO":
            # 1. Puede consultar (GET)
            if request.method in permissions.SAFE_METHODS:
                return True
            # 2. Puede hacer PATCH para recibir mercancía o cerrar orden
            # (El serializer filtrará que NO cambie el precio)
            if request.method == "PATCH":
                return True

        return False
