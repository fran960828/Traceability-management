from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from stock.models import StockMovement


@pytest.mark.django_db
class TestStockMovementViewSet:

    def setup_method(self):
        """Inicialización de URLs usando el basename 'movement'."""
        self.list_url = reverse("stock:movement-list")
        self.adjustment_url = reverse("stock:movement-stock-adjustment")

    @pytest.fixture
    def enologo_data(self, api_client, user_factory):
        """Fixture que devuelve el cliente autenticado y el objeto usuario."""
        enologo = user_factory(role="ENOLOGO")
        api_client.force_authenticate(user=enologo)
        return api_client, enologo

    # --- HAPPY PATH: LECTURA ---
    def test_enologo_can_list_all_movements(self, enologo_data, stock_movement_factory):
        client, enologo = enologo_data
        stock_movement_factory.create_batch(5, user=enologo)

        response = client.get(self.list_url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 5

    def test_enologo_can_retrieve_detail(self, enologo_data, stock_movement_factory):
        client, enologo = enologo_data
        movement = stock_movement_factory(notes="Ajuste por cata", user=enologo)
        # CORREGIDO: Usamos el basename correcto
        url = reverse("stock:movement-detail", kwargs={"pk": movement.pk})

        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["user_full_name"] == enologo.get_full_name()

    # --- HAPPY PATH: ACCIONES ---
    def test_enologo_can_perform_adjustment(
        self, enologo_data, batch_con_po, location_factory
    ):
        client, enologo = enologo_data
        loc = location_factory(name="ZONA_CATAS")

        data = {
            "batch": batch_con_po.id,
            "location": loc.id,
            "quantity": -1,
            "notes": "Control de calidad",
        }

        response = client.post(self.adjustment_url, data)

        # Nota: Si falla por 'movement_type', revisa que el ViewSet
        # asigne StockMovement.MovementType.ADJUSTMENT en el save()
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["user"] == enologo.id

    # --- FILTROS DE PRECISIÓN ---
    def test_enologo_filter_by_product_name(self, enologo_data, stock_movement_factory):
        client, enologo = enologo_data
        m = stock_movement_factory(user=enologo)

        # CORREGIDO: Acceso directo a los atributos del item para evitar AttributeError
        item = m.batch.order_item
        product = item.packaging or item.enological or item.label
        p_name = product.name

        response = client.get(f"{self.list_url}?product_name={p_name}")

        assert response.status_code == status.HTTP_200_OK
        assert any(item["id"] == m.id for item in response.data)

    def test_enologo_filter_by_date_range(self, enologo_data, stock_movement_factory):
        client, enologo = enologo_data

        m_old = stock_movement_factory(user=enologo)
        # CORREGIDO: Usamos .update() para saltar la validación de inmutabilidad del .save()
        old_date = timezone.now() - timedelta(days=10)
        StockMovement.objects.filter(pk=m_old.pk).update(created_at=old_date)

        stock_movement_factory(user=enologo)  # Movimiento de hoy

        date_from = (timezone.now() - timedelta(days=5)).strftime("%Y-%m-%d")
        response = client.get(f"{self.list_url}?date_from={date_from}")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    # --- EDGE CASES: INMUTABILIDAD ---
    def test_enologo_cannot_delete_movement(self, enologo_data, stock_movement_factory):
        client, enologo = enologo_data
        m = stock_movement_factory(user=enologo)
        # CORREGIDO: Basename 'movement'
        url = reverse("stock:movement-detail", kwargs={"pk": m.pk})

        response = client.delete(url)
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_enologo_cannot_modify_movement(self, enologo_data, stock_movement_factory):
        client, enologo = enologo_data
        m = stock_movement_factory(user=enologo)
        # CORREGIDO: Basename 'movement'
        url = reverse("stock:movement-detail", kwargs={"pk": m.pk})

        response = client.patch(url, {"quantity": 1000})
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    # --- VALIDACIONES ---
    def test_action_adjustment_requires_batch(self, enologo_data, location_factory):
        client, _ = enologo_data
        data = {"location": location_factory().id, "quantity": 5}

        response = client.post(self.adjustment_url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "batch" in response.data
