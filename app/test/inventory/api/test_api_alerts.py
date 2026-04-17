import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestInventoryAlertsAPI:

    def test_get_alerts_only_returns_low_stock_items(
        self,
        auth_client,
        label_factory,
        batch_factory,
        stock_movement_factory,
        location_factory,
        user_factory,
    ):
        """
        Prueba que el endpoint /alerts/ devuelva solo lo que está bajo mínimos.
        """
        # 1. Preparación de nombres y entorno
        url = reverse("inventory:label-alerts")
        loc = location_factory()
        user = user_factory()  # El modelo StockMovement exige un usuario

        # 2. Material OK: Mínimo 100, Stock 500 (No debe aparecer)
        label_ok = label_factory(name="ETIQUETA OK", min_stock_level=100)
        batch_ok = batch_factory(order_item__label=label_ok)
        stock_movement_factory(batch=batch_ok, quantity=500, location=loc, user=user)

        # 3. Material BAJO MÍNIMOS: Mínimo 1000, Stock 100 (Debe aparecer)
        label_alert = label_factory(name="ETIQUETA BAJA", min_stock_level=1000)
        batch_alert = batch_factory(order_item__label=label_alert)
        stock_movement_factory(batch=batch_alert, quantity=100, location=loc, user=user)

        # 4. Material IGNORADO: min_stock_level = 0 (No debe aparecer aunque el stock sea 0)
        label_ignored = label_factory(name="ETIQUETA SIN MINIMO", min_stock_level=0)
        batch_not_stock = batch_factory(order_item__label=label_ignored)
        stock_movement_factory(
            batch=batch_not_stock, quantity=200, location=loc, user=user
        )

        # Petición
        response = auth_client.get(url)

        # Verificaciones
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "ETIQUETA BAJA"
        assert data[0]["current_stock"] == 100
        assert data[0]["is_low_stock"] is True

    def test_alerts_empty_when_all_stock_is_fine(self, auth_client, label_factory):
        """Si no hay nada bajo mínimos, debe devolver una lista vacía []."""
        url = reverse("inventory:label-alerts")

        # Creamos una etiqueta que no requiere seguimiento (min=0)
        label_factory(min_stock_level=0)

        response = auth_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    def test_alerts_permission_denied_for_unauthenticated(self, api_client):
        """Verifica que un usuario no logueado reciba 401."""
        url = reverse("inventory:label-alerts")

        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
