from rest_framework import permissions


class SupplierRolePermission(permissions.BasePermission):
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
