import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestLabelCloneAPI:
    """
    Tests específicos para la funcionalidad de clonación y relevo
    de etiquetas en el inventario.
    """

    def setup_method(self):
        """Inicialización de URLs base."""
        self.list_url = reverse("inventory:label-list")

    def get_clone_url(self, pk):
        """Genera la URL de pre-llenado para clonar."""
        return reverse("inventory:label-clone-prefill", kwargs={"pk": pk})

    # ==========================================================================
    # 1. TEST DE PRE-LLENADO (CLONE-PREFILL)
    # ==========================================================================

    def test_clone_label_prefill_cleans_sensitive_fields(
        self, auth_client, label_factory
    ):
        """
        Verifica que el endpoint clone-prefill devuelve los datos listos para
        un nuevo formulario, eliminando claves únicas y añadas viejas.
        """
        # 1. Creamos una etiqueta original con datos completos
        label_original = label_factory(
            name="FRONTAL ONTALBA",
            brand_reference="ONTALBA",
            vintage=2024,
            is_active=True,
        )

        # 2. Llamamos al endpoint de clonación
        url = self.get_clone_url(label_original.pk)
        response = auth_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data

        # 3. VERIFICACIONES DE LIMPIEZA (Campos que NO deben estar en el dict)
        # El Mixin usa .pop(), por lo que las llaves desaparecen
        assert "id" not in data
        assert "internal_code" not in data
        assert "vintage" not in data
        assert "created_at" not in data

        # 4. VERIFICACIONES DE MANTENIMIENTO Y PERSONALIZACIÓN
        assert data["name"] == f"COPIA - {label_original.name}"
        assert data["is_active"] is False  # Por seguridad nace inactiva
        assert data["brand_reference"] == label_original.brand_reference
        assert data["label_type"] == label_original.label_type
        assert data["supplier"] == label_original.supplier.id

    # ==========================================================================
    # 2. TEST DE RELEVO DE AÑADA (POST)
    # ==========================================================================

    def test_automatic_label_relay_on_create(
        self, api_client, user_factory, label_factory, supplier
    ):
        """
        RELEVO: Al crear la Frontal 2025, la Frontal 2024 del mismo producto
        debe pasar a is_active=False.
        """
        # Autenticamos a un usuario con permisos (ENOLOGO)
        user = user_factory(username="enologo_tester", role="ENOLOGO")
        api_client.force_authenticate(user=user)

        # 1. Etiqueta de la añada anterior activa
        old_label = label_factory(
            name="CONTRA ONTALBA",
            brand_reference="ONTALBA",
            label_type="CONTRA",
            vintage=2024,
            is_active=True,
        )

        # 2. Creamos la nueva añada vía POST
        payload = {
            "name": "CONTRA ONTALBA",
            "brand_reference": "ONTALBA",
            "label_type": "CONTRA",
            "vintage": 2025,
            "supplier": supplier.id,
            "unit_mesure": "MILLAR",
            "is_active": True,
        }

        response = api_client.post(self.list_url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

        # 3. VERIFICACIÓN DEL RELEVO
        old_label.refresh_from_db()
        assert (
            old_label.is_active is False
        ), "La etiqueta de 2024 debería haberse desactivado"

    def test_label_relay_does_not_affect_different_types(
        self, api_client, user_factory, label_factory, supplier
    ):
        """
        Seguridad: El relevo es específico por tipo. Crear una FRONTAL 2025
        NO debe desactivar la CONTRA 2024.
        """
        user = user_factory(username="enologo_tester_2", role="ENOLOGO")
        api_client.force_authenticate(user=user)

        # 1. Tenemos una CONTRA de 2024 activa
        contra_2024 = label_factory(
            name="CONTRA ONTALBA",
            brand_reference="ONTALBA",
            label_type="CONTRA",
            vintage=2024,
            is_active=True,
        )

        # 2. Creamos una FRONTAL de 2025 (mismo producto, distinto tipo)
        payload = {
            "name": "FRONTAL ONTALBA",  # Nombre diferente
            "brand_reference": "ONTALBA",
            "label_type": "FRONTAL",
            "vintage": 2025,
            "supplier": supplier.id,
            "unit_mesure": "MILLAR",
            "is_active": True,
        }

        api_client.post(self.list_url, payload, format="json")

        # 3. La CONTRA de 2024 debe seguir activa
        contra_2024.refresh_from_db()
        assert contra_2024.is_active is True
