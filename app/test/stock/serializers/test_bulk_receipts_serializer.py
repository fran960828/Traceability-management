import pytest
from stock.serializers import BulkReceptionSerializer
from purchase.models import PurchaseOrder
from stock.models import StockMovement

@pytest.mark.django_db
class TestBulkReceptionSerializer:

    def test_bulk_reception_happy_path_and_signal(self, po_completa, location_factory, rf, admin_user):
        """HAPPY PATH: Recibir múltiples materiales y verificar la señal de la PO."""
        loc = location_factory()
        # Obtenemos los items de la orden creada en la fixture po_completa
        items = po_completa.items.all()
        
        data = {
            "items": [
                {
                    "order_item": items[0].id,
                    "location": loc.id,
                    "batch_number": "LOTE-A",
                    "quantity": items[0].quantity_ordered # Recibimos todo el primer item
                },
                {
                    "order_item": items[1].id,
                    "location": loc.id,
                    "batch_number": "LOTE-B",
                    "quantity": 1 # Recibimos solo una parte del segundo item
                }
            ]
        }

        # Creamos un contexto de request ficticio para que el serializer acceda al usuario
        request = rf.post('/')
        request.user = admin_user
        
        serializer = BulkReceptionSerializer(data=data, context={'request': request})
        assert serializer.is_valid(), serializer.errors
        
        # Ejecutamos la recepción masiva
        serializer.save()

        # VERIFICACIÓN DE LA SEÑAL
        po_completa.refresh_from_db()
        assert po_completa.status == PurchaseOrder.Status.PARTIAL
        assert items[0].quantity_received == items[0].quantity_ordered

    def test_bulk_reception_duplicate_batches_fails(self, po_completa, location_factory):
        """VALIDACIÓN: No se permiten lotes duplicados en la misma carga masiva."""
        item = po_completa.items.first()
        loc = location_factory()
        
        data = {
            "items": [
                {"order_item": item.id, "location": loc.id, "batch_number": "LOTE-REPETIDO", "quantity": 10},
                {"order_item": item.id, "location": loc.id, "batch_number": "LOTE-REPETIDO", "quantity": 20}
            ]
        }
        
        serializer = BulkReceptionSerializer(data=data)
        assert not serializer.is_valid()
        assert "lote duplicados" in str(serializer.errors['items'])

    def test_bulk_reception_atomic_transaction(self, po_completa, location_factory, rf, admin_user):
        """EDGE CASE: Si un ítem falla, no se debe crear ningún movimiento (Atomicidad)."""
        item = po_completa.items.first()
        loc = location_factory()
        
        # El segundo item causará error por cantidad excedida (10000)
        data = {
            "items": [
                {"order_item": item.id, "location": loc.id, "batch_number": "LOTE-OK", "quantity": 10},
                {"order_item": item.id, "location": loc.id, "batch_number": "LOTE-FAIL", "quantity": 10000}
            ]
        }
        
        request = rf.post('/')
        request.user = admin_user
        serializer = BulkReceptionSerializer(data=data, context={'request': request})
        
        # El serializer debería fallar en la validación antes de crear nada
        assert not serializer.is_valid()
        assert StockMovement.objects.count() == 0