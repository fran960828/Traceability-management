import pytest
from django.urls import reverse
from rest_framework import status
@pytest.mark.django_db
class TestPackagingAPI:

    # Helper para las URLs
    def get_url(self, name="list", pk=None):
        if name == "list":
            return reverse("inventory:packaging-list")
        return reverse("inventory:packaging-detail", kwargs={"pk": pk})

    # ==========================================================================
    # 1. SEGURIDAD Y PERMISOS (Usando tus fixtures del conftest)
    # ==========================================================================

    def test_unauthenticated_access_denied(self, api_client):
        """Usa api_client (sin auth) para verificar el 401/403"""
        url = self.get_url("list")
        response = api_client.get(url)
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_authenticated_access_allowed(self, auth_client, packaging_material):
        """Usa auth_client (ya logueado como BODEGUERO) para el Happy Path"""
        url = self.get_url("list")
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_role_restriction_on_delete(self, api_client, user_factory, packaging_material):
        """
        Edge Case: Probamos un rol que NO tenga permisos de escritura.
        Si 'OPERARIO' no está en tus 'allowed_roles' de utils/permissions.py
        """
        # Creamos un usuario con un rol restringido
        low_privilege_user = user_factory(username="op1", role="OPERARIO")
        api_client.force_authenticate(user=low_privilege_user)
        
        url = self.get_url("detail", pk=packaging_material.pk)
        response = api_client.delete(url)
        
        # Debería fallar por tu RoleBasedPermission
        assert response.status_code == status.HTTP_403_FORBIDDEN

    # ==========================================================================
    # 2. CRUD & FILTERS (Happy Path con auth_client)
    # ==========================================================================

    def test_create_packaging_success(self, api_client, supplier,user_factory):
        """POST: Crear material usando el cliente ya autenticado"""
        url = self.get_url("list")
        data = {
            "name": "BOTELLA BORDELESA 75CL",
            "supplier": supplier.id,
            "packaging_type": "VIDRIO",
            "unit_mesure": "UNIDAD",
            "min_stock_level": 100
        }
        high_privilege_user = user_factory(username="Enologo1", role="ENOLOGO")
        api_client.force_authenticate(user=high_privilege_user)
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "BOTELLA BORDELESA 75CL"

    def test_filter_packaging_by_type(self, auth_client, packaging_factory):
        """Filtros: Verificar que el filtrado funciona para el usuario logueado"""
        packaging_factory(name="BOTELLA", packaging_type="VIDRIO")
        packaging_factory(name="CORCHO", packaging_type="CIERRE")

        url = self.get_url("list")
        response = auth_client.get(url, {"packaging_type": "CIERRE"})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["packaging_type"] == "CIERRE"

    def test_search_packaging_by_name(self, auth_client, packaging_factory):
        """Búsqueda: Verificar ?search="""
        packaging_factory(name="BOTELLA ESPECIAL")
        
        url = self.get_url("list")
        response = auth_client.get(url, {"search": "ESPECIAL"})
        
        assert len(response.data) == 1
        assert "ESPECIAL" in response.data[0]["name"]

 