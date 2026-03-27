import pytest
from django.urls import reverse
from rest_framework import status

@pytest.mark.django_db
class TestEnologicalAPI:

    def get_url(self, name="list", pk=None):
        if name == "list":
            return reverse("inventory:enological-list")
        return reverse("inventory:enological-detail", kwargs={"pk": pk})

    # ==========================================================================
    # 1. MATRIZ DE PERMISOS (BODEGUERO vs COMPRAS vs ENOLOGO)
    # ==========================================================================

    def test_bodeguero_can_only_view(self, api_client, user_factory, enological_material):
        """BODEGUERO: Solo lectura (GET), prohibido escribir (POST/DELETE)"""
        user = user_factory(username="bodeguero_user", role="BODEGUERO")
        api_client.force_authenticate(user=user)
        
        # 1. Puede ver (GET)
        response_get = api_client.get(self.get_url("list"))
        assert response_get.status_code == status.HTTP_200_OK

        # 2. No puede crear (POST)
        response_post = api_client.post(self.get_url("list"), {"name": "INTENTO"})
        assert response_post.status_code == status.HTTP_403_FORBIDDEN

    def test_compras_cannot_delete(self, api_client, user_factory, enological_material):
        """COMPRAS: Puede crear/editar, pero NO eliminar"""
        user = user_factory(username="compras_user", role="COMPRAS")
        api_client.force_authenticate(user=user)
        
        # 1. Puede editar (PATCH)
        url = self.get_url("detail", pk=enological_material.pk)
        response_patch = api_client.patch(url, {"min_stock_level": 20})
        assert response_patch.status_code == status.HTTP_200_OK

        # 2. No puede eliminar (DELETE)
        response_delete = api_client.delete(url)
        assert response_delete.status_code == status.HTTP_403_FORBIDDEN

    def test_enologo_can_do_everything(self, api_client, user_factory, enological_material):
        """ENOLOGO: Poderes totales (CRUD completo)"""
        user = user_factory(username="enologo_user", role="ENOLOGO")
        api_client.force_authenticate(user=user)
        
        url = self.get_url("detail", pk=enological_material.pk)
        
        # Puede eliminar
        response_delete = api_client.delete(url)
        assert response_delete.status_code == status.HTTP_204_NO_CONTENT

    # ==========================================================================
    # 2. HAPPY PATH & LÓGICA DE NEGOCIO (ENOLOGÍA)
    # ==========================================================================

    def test_create_enological_material_success(self, api_client, user_factory, supplier):
        """POST: El enólogo crea un producto con sanitización y código ENO-"""
        user = user_factory(role="ENOLOGO")
        api_client.force_authenticate(user=user)
        
        data = {
            "name": "   metabisulfito potásico   ",
            "supplier": supplier.id,
            "enological_type": "CONSERVANTE",
            "unit_mesure": "KG",
            "min_stock_level": 25
        }
        response = api_client.post(self.get_url("list"), data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "METABISULFITO POTÁSICO"
        assert "ENO-" in response.data["internal_code"]

    # ==========================================================================
    # 3. EDGE CASES & FILTERS
    # ==========================================================================

    def test_enological_unit_measure_fail(self, api_client, user_factory, supplier):
        """Edge Case: Los enológicos NO pueden ser 'UNIDAD' (Validación Serializer)"""
        user = user_factory(role="ENOLOGO")
        api_client.force_authenticate(user=user)
        
        data = {
            "name": "ESTABILIZANTE",
            "supplier": supplier.id,
            "enological_type": "LEVADURA",
            "unit_mesure": "UNIDAD" # Error esperado
        }
        response = api_client.post(self.get_url("list"), data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_filter_enological_by_type(self, auth_client, enological_factory):
        """Filters: Buscar solo conservantes"""
        enological_factory(name="A", enological_type="CONSERVANTE")
        enological_factory(name="B", enological_type="CLARIFICANTE")

        response = auth_client.get(self.get_url("list"), {"enological_type": "CONSERVANTE"})
        assert len(response.data) == 1

 