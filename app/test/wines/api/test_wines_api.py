import pytest
from django.urls import reverse
from rest_framework import status

from wines.models import WineModel


@pytest.mark.django_db
class TestWineViewSet:

    def setup_method(self):
        """URLs básicas del router de wines"""
        self.list_url = reverse("wines:wine-list")

    # ==========================================================================
    # 1. TEST DE PERMISOS (RBAC - Role Based Access Control)
    # ==========================================================================

    def test_enologo_can_do_everything(self, api_client, user_factory, wine_glass_dop):
        """ENOLOGO: CRUD completo habilitado"""
        user = user_factory(username="enologo_user", role="ENOLOGO")
        api_client.force_authenticate(user=user)

        # Test Delete
        url = reverse("wines:wine-detail", kwargs={"pk": wine_glass_dop.id})
        response = api_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert WineModel.objects.count() == 0

    def test_compras_cannot_delete(self, api_client, user_factory, wine_glass_dop):
        """COMPRAS: Puede ver/crear/editar pero NO borrar"""
        user = user_factory(username="compras_user", role="COMPRAS")
        api_client.force_authenticate(user=user)

        url = reverse("wines:wine-detail", kwargs={"pk": wine_glass_dop.id})
        response = api_client.delete(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert WineModel.objects.count() == 1

    def test_bodeguero_only_read_only(self, api_client, user_factory, wine_glass_dop):
        """BODEGUERO: Solo puede ver (GET)"""
        user = user_factory(username="bodeguero_user", role="BODEGUERO")
        api_client.force_authenticate(user=user)

        # Intentar editar (PATCH)
        url = reverse("wines:wine-detail", kwargs={"pk": wine_glass_dop.id})
        response = api_client.patch(url, {"name": "HACKED"})

        assert response.status_code == status.HTTP_403_FORBIDDEN
        # Verificar que sí puede listar
        response_list = api_client.get(self.list_url)
        assert response_list.status_code == status.HTTP_200_OK

    # ==========================================================================
    # 2. TEST DE FILTROS Y BÚSQUEDA
    # ==========================================================================

    def test_filter_wines_by_vintage(self, auth_client, wine_factory):
        """Filtro por añada exacta"""
        wine_factory(vintage=2020, name="Vino Viejo")
        wine_factory(vintage=2024, name="Vino Nuevo")

        response = auth_client.get(self.list_url, {"vintage": 2024})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["vintage"] == 2024

    def test_search_wines_by_name_or_code(self, auth_client, wine_factory):
        """Búsqueda por texto (SearchFilter)"""
        wine_factory(name="ALMA DE GRIAL")

        response = auth_client.get(self.list_url, {"search": "GRIAL"})
        assert len(response.data) == 1
        assert "GRIAL" in response.data[0]["name"]

    # ==========================================================================
    # 3. EDGE CASES Y REGLAS DE NEGOCIO (POST)
    # ==========================================================================

    def test_create_wine_success(
        self, api_client, user_factory, packaging_factory, label_factory
    ):
        """POST Exitoso: Con todos los materiales correctos"""
        user = user_factory(role="ENOLOGO")
        api_client.force_authenticate(user=user)

        bottle = packaging_factory(packaging_type="VIDRIO")
        cork = packaging_factory(packaging_type="CIERRE")
        label = label_factory(vintage=2024, label_type="FRONTAL")

        payload = {
            "name": "RESERVA EXCLUSIVA",
            "vintage": 2024,
            "appellation_type": "MESA",
            "appellation_name": "ESPAÑA",
            "wine_type": "TINTO",
            "aging_category": "JOVEN",
            "varietals": "Tempranillo",
            "alcohol_percentage": 13.5,
            "default_container": bottle.id,
            "default_cork": cork.id,
            "default_front_label": label.id,
        }

        response = api_client.post(self.list_url, payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert "WN-2024-" in response.data["internal_code"]  # Código automático

    def test_create_wine_error_vintage_mismatch(
        self, api_client, user_factory, packaging_factory, label_factory
    ):
        """Edge Case: El API debe rebotar el error si las añadas no coinciden"""
        user = user_factory(role="ENOLOGO")
        api_client.force_authenticate(user=user)

        # Etiqueta de 2020 para un vino de 2024
        label_vieja = label_factory(vintage=2020, label_type="FRONTAL")
        bottle = packaging_factory()

        payload = {
            "name": "VINO TEST",
            "vintage": 2024,
            "appellation_type": "MESA",
            "appellation_name": "ESPAÑA",
            "wine_type": "TINTO",
            "aging_category": "JOVEN",
            "varietals": "Test",
            "alcohol_percentage": 12.0,
            "default_container": bottle.id,
            "default_front_label": label_vieja.id,
        }

        response = api_client.post(self.list_url, payload)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # Verificamos que el error viene estructurado por el Serializer
        assert "default_front_label" in response.data

    def test_error_vidrio_sin_corcho(self, api_client, user_factory, packaging_factory):
        """Error: Botella de VIDRIO enviada sin el campo default_cork"""
        user = user_factory(role="ENOLOGO")
        api_client.force_authenticate(user=user)

        bottle = packaging_factory(packaging_type="VIDRIO")

        # Debemos enviar TODO lo que el modelo pide como obligatorio
        payload = {
            "name": "VINO SIN CORCHO",
            "vintage": 2026,
            "appellation_type": "DOP",
            "appellation_name": "RIOJA",  # Ahora sí lo enviamos
            "wine_type": "TINTO",
            "aging_category": "CRIANZA",  # Obligatorio
            "varietals": "100% Tempranillo",  # Obligatorio
            "alcohol_percentage": 14.0,  # Obligatorio
            "default_container": bottle.id,
            # 'default_cork' sigue faltando a propósito
        }

        response = api_client.post(self.list_url, payload)

        # Ahora el Serializer dirá "OK, los campos están",
        # pasará al Modelo, y el Modelo dirá "¡Falta el corcho!"
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "default_cork" in response.data
        assert "default_dop_seal" in response.data

    def test_error_material_no_es_cierre(
        self, api_client, user_factory, packaging_factory
    ):
        """Error: Se envía un material en default_cork que NO es de tipo CIERRE"""
        user = user_factory(role="ENOLOGO")
        api_client.force_authenticate(user=user)

        bottle = packaging_factory(packaging_type="VIDRIO")
        otra_botella = packaging_factory(packaging_type="VIDRIO", name="BOTELLA 2")

        payload = {
            "name": "VINO CON CIERRE ERRONEO",
            "vintage": 2024,
            "appellation_type": "MESA",
            "wine_type": "TINTO",
            "default_container": bottle.id,
            "default_cork": otra_botella.id,  # ERROR: Metemos una botella donde va un corcho
        }

        response = api_client.post(self.list_url, payload)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # Aquí puede saltar el error del Serializer (validate) o del Modelo (clean)
        assert "default_cork" in response.data
