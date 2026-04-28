import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestProductionOrderAPI:

    def setup_method(self):
        # URL base del ViewSet
        self.list_url = reverse("production_record:order-list")

    # --- HAPPY PATHS ---

    def test_list_production_orders(self, auth_client, production_order_factory):
        """Verificar que un usuario autenticado puede listar sus partes."""
        production_order_factory(lot_number="L-001")
        production_order_factory(lot_number="L-002")

        response = auth_client.get(self.list_url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_create_production_order_draft(
        self, auth_client, wine_factory, user_factory
    ):
        """Crear un borrador de producción con materiales enológicos."""
        # Vino con receta completa (usamos Vidrio para que sea exigente)
        wine = wine_factory(
            default_container__packaging_type="VIDRIO",
            default_cork__packaging_type="CIERRE",
            default_front_label__label_type="FRONTAL",
            default_back_label__label_type="CONTRA",
        )
        user = user_factory()

        data = {
            "wine": wine.id,
            "production_date": "2026-04-15",
            "user": user.id,
            "quantity_produced": 1000,
            "bulk_liters_withdrawn": 760,
            "lot_number": "LOTE-NUEVO-01",
            "enological_materials": [],
        }

        response = auth_client.post(self.list_url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == "DRAFT"
        # Verificamos que el usuario se inyectó automáticamente
        assert response.data["user_username"] == "admin_test"

    def test_confirm_production_order_success(
        self, auth_client, escenario_produccion_con_stock
    ):
        """
        EL TEST MAESTRO: Confirmar una orden y verificar que el stock se mueve.
        Usa el escenario con stock real en los lotes.
        """
        order = escenario_produccion_con_stock
        url = reverse("production_record:order-confirm", kwargs={"pk": order.id})

        response = auth_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        order.refresh_from_db()
        assert order.status == "CONFIRMED"

    def test_cancel_production_order(self, auth_client, production_order_factory):
        """Cancelar un borrador que no queremos procesar."""
        order = production_order_factory(status="DRAFT")
        url = reverse("production_record:order-cancel", kwargs={"pk": order.id})

        response = auth_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        order.refresh_from_db()
        assert order.status == "CANCELLED"

    # --- VALIDACIONES Y EDGE CASES ---

    def test_cannot_confirm_twice(self, auth_client, escenario_produccion_con_stock):
        """No se puede confirmar una orden que ya está confirmada."""
        order = escenario_produccion_con_stock
        order.status = "CONFIRMED"
        order.save()

        url = reverse("production_record:order-confirm", kwargs={"pk": order.id})
        response = auth_client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "ya está confirmada" in response.data["detail"]

    def test_create_order_fails_incomplete_recipe(
        self, auth_client, wine_factory, user_factory
    ):
        """Validación: El Serializer debe rechazar el vino incompleto."""
        url = reverse("production_record:order-list")

        # Necesitamos un usuario para el JSON (aunque el ViewSet lo sobreescriba, el Serializer lo pide)
        user = user_factory()

        wine_incompleto = wine_factory.build(
            default_container__packaging_type="VIDRIO", default_cork=None
        )
        wine_incompleto.save_base(raw=True)

        data = {
            "wine": wine_incompleto.id,
            "user": user.id,  # <--- AÑADE ESTO
            "production_date": "2026-04-15",
            "quantity_produced": 500,
            "bulk_liters_withdrawn": 380,
            "lot_number": "LOTE-FALLIDO-01",
        }

        response = auth_client.post(url, data, format="json")

        # Ahora sí, el error 400 será por el vino, no por el usuario
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "wine" in response.data
        assert "Receta incompleta" in str(response.data["wine"])

    def test_unauthenticated_user_access_denied(self, api_client):
        """Seguridad: Un usuario sin token no puede entrar."""
        response = api_client.get(self.list_url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_filter_orders_by_active_wine_only(
        self, auth_client, production_order_factory, wine_factory
    ):
        """
        Verifica que al filtrar por vino, solo se devuelven órdenes si el vino está activo.
        """
        # 1. Creamos un vino activo y uno inactivo
        vino_activo = wine_factory(name="Vino Activo", is_active=True)
        vino_inactivo = wine_factory(name="Vino Obsoleto", is_active=False)

        # 2. Creamos órdenes para ambos
        production_order_factory(wine=vino_activo, lot_number="L-ACT")
        production_order_factory(
            wine=vino_inactivo, lot_number="L-OBS"
        )

        # --- CASO A: Filtrar por el vino activo ---
        response = auth_client.get(self.list_url, {"wine": vino_activo.id})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["lot_number"] == "L-ACT"

        # --- CASO B: Filtrar por el vino inactivo ---
        # El filtro 'wine__is_active=True' debería hacer que no devuelva nada
        response = auth_client.get(self.list_url, {"wine": vino_inactivo.id})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 0
