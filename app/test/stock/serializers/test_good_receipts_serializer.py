import pytest
from stock.serializers import GoodsReceptionItemSerializer
from purchase.models import PurchaseOrder

@pytest.mark.django_db
class TestGoodsReceptionItemSerializer:

    def test_reception_item_happy_path(self, batch_con_po, location_factory):
        """HAPPY PATH: Datos de recepción válidos."""
        item = batch_con_po.order_item
        loc = location_factory()
        data = {
            "order_item": item.id,
            "location": loc.id,
            "batch_number": "BATCH-001",
            "quantity": 500  # Pedido original de la fixture: 1000
        }
        serializer = GoodsReceptionItemSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_reception_item_over_receiving_fails(self, batch_con_po, location_factory):
        """VALIDACIÓN: No se puede recibir más de lo que queda pendiente."""
        item = batch_con_po.order_item
        loc = location_factory()
        data = {
            "order_item": item.id,
            "location": loc.id,
            "batch_number": "BATCH-X",
            "quantity": 1500  # Excede los 1000 pedidos
        }
        serializer = GoodsReceptionItemSerializer(data=data)
        assert not serializer.is_valid()
        assert "Cantidad excedida" in str(serializer.errors['non_field_errors'])

    def test_reception_item_invalid_po_status(self, batch_con_po, location_factory):
        """EDGE CASE: No se recibe mercancía si la PO está cerrada o cancelada."""
        item = batch_con_po.order_item
        po = item.purchase_order
        po.status = PurchaseOrder.Status.CLOSED
        po.save()

        data = {
            "order_item": item.id,
            "location": location_factory().id,
            "batch_number": "B-1",
            "quantity": 100
        }
        serializer = GoodsReceptionItemSerializer(data=data)
        assert not serializer.is_valid()
        assert "No se puede recibir mercancía" in str(serializer.errors['non_field_errors'])