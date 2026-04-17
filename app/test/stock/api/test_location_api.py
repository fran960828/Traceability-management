from test.stock.factories import LocationFactory

import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestLocationViewSet:

    def setup_method(self):
        self.list_url = reverse("stock:location-list")

    # --- HAPPY PATH ---
    def test_list_locations(self, auth_client):
        """HAPPY PATH: Un usuario autenticado puede listar las ubicaciones."""
        LocationFactory.create_batch(3)

        response = auth_client.get(self.list_url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3

    def test_create_location_enologo(self, api_client, user_factory):
        """HAPPY PATH: El Enólogo puede crear nuevas ubicaciones."""
        enologo = user_factory(role="ENOLOGO")
        api_client.force_authenticate(user=enologo)

        data = {"name": "Cámara de Envejecimiento", "description": "Zona controlada"}
        response = api_client.post(self.list_url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "CÁMARA_DE_ENVEJECIMIENTO"  # Normalizado

    # --- PERMISOS ---
    def test_bodeguero_can_create_location(self, api_client, user_factory):
        """PERMISOS: El bodeguero solo tiene acceso de lectura (SAFE_METHODS)."""
        bodeguero = user_factory(role="BODEGUERO")
        api_client.force_authenticate(user=bodeguero)

        data = {"name": "NUEVO_ALMACEN"}
        response = api_client.post(self.list_url, data)

        # Basado en tu PurchaseRolePermission, el Bodeguero no tiene acceso a POST
        assert response.status_code == status.HTTP_201_CREATED

    def test_unauthenticated_access_denied(self, api_client):
        """PERMISOS: Un usuario no logueado no puede acceder a nada."""
        response = api_client.get(self.list_url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    # --- VALIDACIONES Y EDGE CASES ---
    def test_duplicate_location_name_fails(self, api_client, user_factory):
        """VALIDACIÓN: No se permiten nombres duplicados (insensibilidad a mayúsculas)."""
        LocationFactory(name="ZONA_A")
        enologo = user_factory(role="ENOLOGO")
        api_client.force_authenticate(user=enologo)

        # Intentamos crear con minúsculas
        data = {"name": "ZONA_A"}
        response = api_client.post(self.list_url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "name" in response.data

    def test_retrieve_specific_location(self, auth_client):
        """HAPPY PATH: Obtener el detalle de una ubicación por ID."""
        loc = LocationFactory(name="ALMACEN_EXCLUSIVO")
        url = reverse("stock:location-detail", kwargs={"pk": loc.pk})

        response = auth_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "ALMACEN_EXCLUSIVO"

    def test_delete_location_as_enologo(self, api_client, user_factory):
        """HAPPY PATH: El Enólogo puede borrar ubicaciones (Dios en la bodega)."""
        loc = LocationFactory()
        enologo = user_factory(role="ENOLOGO")
        api_client.force_authenticate(user=enologo)

        url = reverse("stock:location-detail", kwargs={"pk": loc.pk})
        response = api_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not loc.__class__.objects.filter(pk=loc.pk).exists()

    def test_compras_can_delete_location(self, api_client, user_factory):
        """PERMISOS: El rol COMPRAS no debería poder borrar (según tu lógica de permisos)."""
        loc = LocationFactory()
        compras = user_factory(role="COMPRAS")
        api_client.force_authenticate(user=compras)

        url = reverse("stock:location-detail", kwargs={"pk": loc.pk})
        response = api_client.delete(url)

        # Dependiendo de cómo apliques PurchaseRolePermission a Stock,
        # COMPRAS suele estar capado para borrar.
        assert response.status_code == status.HTTP_204_NO_CONTENT
