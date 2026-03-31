import pytest
from purchase.serializers import PurchaseOrderSerializer
from purchase.models import PurchaseOrder

@pytest.mark.django_db
class TestPurchaseOrderSerializer:

    # --- HAPPY PATH ---
    def test_create_po_with_items_success(self, supplier_factory, packaging_factory):
        """ESCENARIO: Crear una orden con dos líneas de producto válidas."""
        supplier = supplier_factory()
        pack = packaging_factory()
        
        data = {
            "supplier": supplier.id,
            "status": "DRAFT",
            "items": [
                {"packaging": pack.id, "quantity_ordered": 100, "unit_price": "0.5000"},
                {"packaging": pack.id, "quantity_ordered": 200, "unit_price": "0.4500"}
            ]
        }
        
        serializer = PurchaseOrderSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        order = serializer.save()
        
        assert PurchaseOrder.objects.count() == 1
        assert order.items.count() == 2
        assert order.order_number.startswith("PO-2026-")

    # --- EDGE CASES & VULNERABILIDADES ---
    def test_error_empty_items_list(self, supplier_factory):
        """EDGE CASE: No permitir crear una orden sin productos."""
        data = {
            "supplier": supplier_factory().id,
            "items": []
        }
        serializer = PurchaseOrderSerializer(data=data)
        assert not serializer.is_valid()
        assert "items" in serializer.errors

    def test_atomic_rollback_on_item_error(self, supplier_factory, packaging_factory):
        """
        VULNERABILIDAD/ATOMICIDAD: Si una línea falla (ej: precio negativo), 
        no debe crearse ni la orden ni las líneas previas.
        """
        supplier = supplier_factory()
        pack = packaging_factory()
        
        data = {
            "supplier": supplier.id,
            "items": [
                {"packaging": pack.id, "quantity_ordered": 100, "unit_price": "0.50"}, # OK
                {"packaging": pack.id, "quantity_ordered": 100, "unit_price": "-1.0"} # ERROR
            ]
        }
        
        serializer = PurchaseOrderSerializer(data=data)
        # El serializer debería detectar el error en la segunda línea
        assert not serializer.is_valid()
        
        # VERIFICACIÓN ATÓMICA: No debe haber quedado rastro en la DB
        assert PurchaseOrder.objects.count() == 0

    def test_update_blocked_when_closed(self, purchase_order_factory):
        """VULNERABILIDAD: El serializer debe impedir updates si la orden ya está CLOSED."""
        po = purchase_order_factory(status=PurchaseOrder.Status.CLOSED)
        serializer = PurchaseOrderSerializer(instance=po, data={"notes": "Nueva nota"}, partial=True)
        
        assert not serializer.is_valid()
        assert "non_field_errors" in serializer.errors or "detail" in str(serializer.errors)