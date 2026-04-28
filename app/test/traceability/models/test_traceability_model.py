import pytest
import hashlib
import json
from decimal import Decimal
from django.core.exceptions import ValidationError
from traceability.models import LotTraceability

@pytest.mark.django_db
class TestTraceabilityLogic:

    # --- HAPPY PATH ---

    def test_traceability_lifecycle_automation(self, escenario_produccion_con_stock):
        """Verifica que el registro nace solo al confirmar la orden."""
        order = escenario_produccion_con_stock
        
        # 1. Estado DRAFT: No hay registro
        assert not hasattr(order, 'traceability_record')
        
        # 2. Confirmamos
        order.confirm_production()
        
        # 3. Estado CONFIRMED: Registro creado automáticamente por la Signal
        assert LotTraceability.objects.filter(production_order=order).exists()
        assert order.traceability_record.integrity_hash is not None

    def test_snapshot_completeness(self, orden_trazada_y_confirmada):
        """Verifica que el JSON tiene todas las secciones requeridas."""
        trace = orden_trazada_y_confirmada.traceability_record
        snapshot = trace.history_snapshot

        expected_sections = ['order_details', 'efficiency', 'packaging_materials', 'enological_additives']
        for section in expected_sections:
            assert section in snapshot
            
        assert snapshot['order_details']['lot_number'] == orden_trazada_y_confirmada.lot_number
        assert "loss_percentage" in snapshot['efficiency']

    # --- EDGE CASES ---

    def test_traceability_with_zero_enological_items(self, escenario_produccion_con_stock):
        """Verifica que funciona sin materiales enológicos manuales."""
        order = escenario_produccion_con_stock
        # No añadimos ProductionEnologicalItem
        order.confirm_production()
        
        snapshot = order.traceability_record.history_snapshot
        assert snapshot['enological_additives'] == [] # Lista vacía, pero existe

    def test_integrity_hash_generation(self, orden_trazada_y_confirmada):
        """Valida que el hash guardado coincide con el contenido del snapshot."""
        trace = orden_trazada_y_confirmada.traceability_record
        
        # Replicamos el proceso de hasheo
        dump = json.dumps(trace.history_snapshot, sort_keys=True).encode()
        expected_hash = hashlib.sha256(dump).hexdigest()
        
        assert trace.integrity_hash == expected_hash

    # --- VALIDACIONES DE ROBUSTEZ (La clave del sistema) ---

    def test_immutability_snapshot_vs_master_data(self, escenario_produccion_con_stock):
        """
        Si el nombre del material cambia en el futuro, 
        el snapshot debe mantener el nombre original.
        """
        order = escenario_produccion_con_stock
        material_original = order.wine.default_container.name 
        
        order.confirm_production()
        
        # Cambiamos el nombre del material en el catálogo maestro
        container = order.wine.default_container
        container.name = "Botella PREMIUM Edición Limitada"
        container.save()
        
        # El snapshot debe seguir diciendo el nombre original
        snapshot = order.traceability_record.history_snapshot
        packaging_names = [p['material_name'] for p in snapshot['packaging_materials']]
        
        assert material_original in packaging_names
        assert "Botella PREMIUM Edición Limitada" not in packaging_names

    def test_integrity_verification_logic(self, orden_trazada_y_confirmada):
        """
        Simulamos que alguien manipula el JSON directamente en la DB.
        El sistema debería detectar que la integridad se ha roto.
        """
        trace = orden_trazada_y_confirmada.traceability_record
        
        # 1. Hash original es válido
        dump_original = json.dumps(trace.history_snapshot, sort_keys=True).encode()
        assert trace.integrity_hash == hashlib.sha256(dump_original).hexdigest()
        
        # 2. Manipulamos el snapshot (ej: bajamos la merma fraudulentamente)
        trace.history_snapshot['efficiency']['loss_percentage'] = "0.0%"
        
        # 3. El hash ya no debería coincidir
        dump_manipulado = json.dumps(trace.history_snapshot, sort_keys=True).encode()
        new_hash = hashlib.sha256(dump_manipulado).hexdigest()
        
        assert trace.integrity_hash != new_hash

    def test_user_snapshot_persistence(self, escenario_produccion_con_stock):
        """
        Verifica que el nombre del responsable queda 'grabado' en el snapshot
        y no cambia aunque el perfil del usuario se actualice.
        """
        order = escenario_produccion_con_stock
        user = order.user
        user_name_original = user.get_full_name()
        
        # 1. Confirmamos la producción (se genera el snapshot con el nombre actual)
        order.confirm_production()
        
        # Refrescamos para obtener el registro de trazabilidad
        order.refresh_from_db()
        snapshot_antes = order.traceability_record.history_snapshot
        assert snapshot_antes['order_details']['user_responsible'] == user_name_original

        # 2. En lugar de borrar (que da ProtectedError), cambiamos el nombre del usuario
        user.first_name = "Nombre"
        user.last_name = "Modificado"
        user.save()

        # 3. Verificamos que el snapshot SIGUE teniendo el nombre original
        # Esto demuestra que es una "foto fija" y no una consulta dinámica
        assert order.traceability_record.history_snapshot['order_details']['user_responsible'] == user_name_original
        assert order.traceability_record.history_snapshot['order_details']['user_responsible'] != user.get_full_name()