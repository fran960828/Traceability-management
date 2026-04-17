import pytest
from django.urls import reverse
from rest_framework import status

from purchase.models import PurchaseOrder


@pytest.mark.django_db
class TestPurchaseCloneAPI:
    """
    Tests para la funcionalidad de pre-llenado (clonación) de Órdenes de Compra.
    Verifica que tanto la cabecera como las líneas de pedido se limpien correctamente.
    """

    def setup_method(self):
        """Inicialización de URLs y autenticación por defecto."""
        self.list_url = reverse("purchase:order-list")

    def get_clone_url(self, pk):
        """Genera la URL de pre-llenado para clonar una orden específica."""
        return reverse("purchase:order-clone-prefill", kwargs={"pk": pk})

    def test_clone_purchase_order_prefill_cleans_header_and_items(
        self,
        auth_client,
        user_factory,
        purchase_order_factory,
        purchase_order_item_factory,
    ):
        """
        Verifica que el endpoint clone-prefill devuelva la estructura completa
        pero con campos únicos y de estado reseteados.
        """
        # 1. Setup: Usuario con permisos (ENOLOGO)
        user = user_factory(username="purchase_manager", role="ENOLOGO")
        auth_client.force_authenticate(user=user)

        # 2. Creamos una orden original CERRADA con 2 ítems
        order_original = purchase_order_factory(
            status="CLOSED", order_number="PO-2024-ORIGINAL"
        )
        # Añadimos ítems con cantidades recibidas
        item1 = purchase_order_item_factory(
            purchase_order=order_original, quantity_ordered=1000, quantity_received=1000
        )
        item2 = purchase_order_item_factory(
            purchase_order=order_original, quantity_ordered=500, quantity_received=500
        )

        # 3. Llamada al endpoint de clonación
        url = self.get_clone_url(order_original.pk)
        response = auth_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data

        # --- VERIFICACIONES DE CABECERA ---
        assert "id" not in data
        assert "order_number" not in data
        assert data["status"] == "DRAFT"  # Resetado a borrador
        assert data["supplier"] == order_original.supplier.id
        assert "date_delivery_expected" not in data  # Limpiado en reset_fields

        # --- VERIFICACIONES DE ÍTEMS ANIDADOS ---
        assert "items" in data
        assert len(data["items"]) == 2

        for item in data["items"]:
            assert "id" not in item  # El ID de la línea debe desaparecer
            assert "purchase_order" not in item
            assert item["quantity_received"] == 0  # Reseteado en prepare_clone_data
            # Mantiene el producto y el precio original para agilizar la compra
            assert "unit_price" in item
            assert "quantity_ordered" in item

    def test_create_new_order_from_cloned_data(
        self,
        auth_client,
        user_factory,
        purchase_order_factory,
        purchase_order_item_factory,
    ):
        """
        Prueba el flujo completo: obtener datos de clonación y enviarlos
        al endpoint de creación para generar un pedido real.
        """
        user = user_factory(username="buyer", role="ENOLOGO")
        auth_client.force_authenticate(user=user)

        # 1. Orden base
        order_base = purchase_order_factory()
        purchase_order_item_factory(purchase_order=order_base)

        # 2. Obtenemos el pre-llenado
        clone_data = auth_client.get(self.get_clone_url(order_base.pk)).data

        # 3. Enviamos los datos al POST de creación (simulando la acción del frontend)
        # Modificamos algo mínimo para que sea un pedido "nuevo"
        clone_data["notes"] = "Pedido clonado del año anterior"

        response = auth_client.post(self.list_url, clone_data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert PurchaseOrder.objects.count() == 2

        new_order = PurchaseOrder.objects.latest("id")
        assert new_order.status == "DRAFT"
        assert new_order.items.count() == 1
        assert new_order.notes == "Pedido clonado del año anterior"
