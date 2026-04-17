import pytest
from django.urls import reverse
from rest_framework import status

from wines.models import WineModel


@pytest.mark.django_db
class TestWineViewSetClone:

    def test_clone_prefill_cleans_data_correctly(
        self, auth_client, wine_factory, label_factory
    ):
        """
        Verifica que el endpoint clone-prefill devuelve los datos listos para
        un nuevo formulario, eliminando IDs, códigos y etiquetas de añadas viejas.
        """
        # 1. Creamos un vino original con etiquetas vinculadas
        etiqueta = label_factory(vintage=2024, label_type="FRONTAL")
        wine_original = wine_factory(
            name="RESERVA ONTALBA",
            vintage=2024,
            default_front_label=etiqueta,
            is_active=True,
        )

        # 2. Llamamos al endpoint de clonación
        url = reverse("wines:wine-clone-prefill", kwargs={"pk": wine_original.id})
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        # 3. VERIFICACIONES DE LIMPIEZA
        assert "id" not in data
        assert "internal_code" not in data
        assert "vintage" not in data  # <--- Cambia esto
        assert "default_front_label" not in data  # Etiquetas limpias

        # 4. VERIFICACIONES DE MANTENIMIENTO
        assert data["name"] == f"COPIA - {wine_original.name}"
        # El contenedor (botella) debería mantenerse si no está en clone_reset_fields
        assert data["default_container"] == wine_original.default_container.id

    def test_automatic_vintage_relay_on_create(
        self, api_client, user_factory, wine_factory, packaging_factory
    ):
        """
        RELEVO DE AÑADA: Al crear 'Vino X' de 2025, el 'Vino X' de 2024 debe pasar a is_active=False.
        """
        user = user_factory(role="ENOLOGO")
        api_client.force_authenticate(user=user)

        # 1. Tenemos la añada anterior activa
        old_wine = wine_factory(name="GRAN RESERVA", vintage=2024, is_active=True)
        bottle = packaging_factory(packaging_type="VIDRIO")
        cork = packaging_factory(packaging_type="CIERRE")

        # 2. Creamos la nueva añada con el mismo nombre
        payload = {
            "name": "GRAN RESERVA",  # Mismo nombre para activar el relevo
            "vintage": 2025,
            "appellation_type": "MESA",
            "appellation_name": "ESPAÑA",
            "wine_type": "TINTO",
            "aging_category": "GRAN_RESERVA",
            "varietals": "Tempranillo",
            "alcohol_percentage": 14.0,
            "default_container": bottle.id,
            "default_cork": cork.id,
            "is_active": True,
        }
        url = reverse("wines:wine-list")
        response = api_client.post(url, payload)
        assert response.status_code == status.HTTP_201_CREATED

        # 3. VERIFICACIÓN DEL RELEVO
        old_wine.refresh_from_db()
        assert (
            old_wine.is_active is False
        ), "La añada anterior debería haberse desactivado"

        new_wine = WineModel.objects.get(vintage=2025, name="GRAN RESERVA")
        assert new_wine.is_active is True, "La nueva añada debe estar activa"

    def test_relay_does_not_affect_different_wines(
        self, auth_client, wine_factory, user_factory, packaging_factory
    ):
        """
        Seguridad: Crear un vino nuevo no debe desactivar otros vinos que no se llamen igual.
        """
        user = user_factory(role="ENOLOGO")
        auth_client.force_authenticate(user=user)

        # Vino de una gama distinta
        otro_vino = wine_factory(name="BLANCO JOVEN", is_active=True)
        bottle = packaging_factory()

        payload = {
            "name": "TINTO ROBLE",  # Nombre distinto
            "vintage": 2025,
            "appellation_type": "MESA",
            "appellation_name": "ESPAÑA",
            "wine_type": "TINTO",
            "aging_category": "ROBLE",
            "varietals": "Monastrell",
            "alcohol_percentage": 13.0,
            "default_container": bottle.id,
        }
        url = reverse("wines:wine-list")
        auth_client.post(url, payload)

        otro_vino.refresh_from_db()
        assert otro_vino.is_active is True
