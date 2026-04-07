import pytest
from django.urls import reverse
from rest_framework import status

from purchase.models import PurchaseOrder


@pytest.mark.django_db
class TestPurchaseOrderViewSet:

    def setup_method(self):
        self.list_url = reverse("purchase:order-list")

    # --- HAPPY PATH ---
    def test_enologo_can_create_order_with_items(
        self, auth_client, user_factory, supplier_factory, packaging_factory
    ):
        """HAPPY PATH: Un Enólogo crea una orden completa con éxito."""
        user = user_factory(username="boss", role="ENOLOGO")
        auth_client.force_authenticate(user=user)

        supplier = supplier_factory()
        pack = packaging_factory()

        data = {
            "supplier": supplier.id,
            "status": "DRAFT",
            "items": [
                {"packaging": pack.id, "quantity_ordered": 100, "unit_price": "1.50"}
            ],
        }

        response = auth_client.post(self.list_url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert PurchaseOrder.objects.count() == 1
        assert response.data["order_number"].startswith("PO-2026")

    # --- FILTERS ---
    def test_filter_orders_by_status(self, auth_client, purchase_order_factory):
        """FILTER: Verificar que el filtrado por estado en la URL funciona."""
        purchase_order_factory(status="DRAFT")
        purchase_order_factory(status="OPEN")

        # Filtramos por DRAFT
        response = auth_client.get(self.list_url, {"status": "DRAFT"})
        assert len(response.data) == 1
        assert response.data[0]["status"] == "DRAFT"

    # --- EDGE CASES & PERMISOS ---
    def test_bodeguero_cannot_delete_order(
        self, auth_client, user_factory, purchase_order_factory
    ):
        """EDGE CASE: El bodeguero tiene prohibido el DELETE."""
        user = user_factory(username="worker", role="BODEGUERO")
        auth_client.force_authenticate(user=user)
        order = purchase_order_factory()

        url = reverse("purchase:order-detail", kwargs={"pk": order.id})
        response = auth_client.delete(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_bodeguero_can_patch_status(
        self, auth_client, user_factory, purchase_order_factory
    ):
        """PERMISSION: El bodeguero SÍ puede cambiar el estado (recepción)."""
        user = user_factory(username="worker_patch", role="BODEGUERO")
        auth_client.force_authenticate(user=user)
        order = purchase_order_factory(status="OPEN")

        url = reverse("purchase:order-detail", kwargs={"pk": order.id})
        response = auth_client.patch(url, {"status": "CLOSED"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        order.refresh_from_db()
        assert order.status == "CLOSED"
