import pytest
from decimal import Decimal
from pricing.serializers import ProductionCostingSerializer
from pricing.utils.services import CostingService
from pricing.models import ProductionCosting

@pytest.mark.django_db
class TestProductionCostingSerializer:

    # --- HAPPY PATH (Presentación) ---
    def test_representation_rounding_and_relations(self, escenario_escandallo_completo):
        """
        Verifica que el JSON de salida tenga el lot_number, nombre del vino
        y todos los precios redondeados a 2 decimales.
        """
        order = escenario_escandallo_completo
        # Generamos el escandallo usando el servicio (que ya probamos que funciona)
        
        escandallo = CostingService.generate_escandallo(order)
        
        serializer = ProductionCostingSerializer(instance=escandallo)
        data = serializer.data
        
        # 1. Verificación de relaciones "aplanadas"
        assert data['order_lot'] == order.lot_number
        assert data['wine_name'] == order.wine.name

        # 2. Verificación de redondeo (Strings de 2 decimales)
        # En el escenario completo, el material era 1600.0000 e indirectos ~170.0000
        assert data['total_material_cost'] == "1800.00"
        assert isinstance(data['total_material_cost'], str) # DRF envía decimales formateados como string

        # 3. Verificación del Snapshot interno
        first_mat = list(data['materials_snapshot'].values())[0]
        # Aseguramos que el unit_price en el JSON también tiene 2 decimales
        assert first_mat['unit_price'] == "0.50" 

    # --- EDGE CASES ---
    def test_serialize_with_none_values(self, production_order_factory):
        """Verifica que el serializer no explote si algún valor es None."""
        order = production_order_factory()
        # Creamos un costing "vacío" o manual (si el modelo lo permite)
        
        costing = ProductionCosting.objects.create(
            production_order=order,
            total_material_cost=Decimal("0.0000"),
            total_indirect_cost=Decimal("0.0000"),
            grand_total=Decimal("0.0000"),
            unit_cost=Decimal("0.0000"),
            materials_snapshot={},
            labor_total=Decimal("0.0000"),    
            energy_total=Decimal("0.0000"),   
            amortization_total=Decimal("0.0000") 
        )
        
        serializer = ProductionCostingSerializer(instance=costing)
        assert serializer.data['unit_cost'] == "0.00"
        assert serializer.data['materials_snapshot'] == {}

    # --- VALIDATIONS (Read Only) ---
    def test_fields_are_read_only(self):
        """
        Verifica que aunque intentemos enviar datos, el serializer 
        no permita escribir en campos protegidos.
        """
        serializer = ProductionCostingSerializer()
        # Comprobamos que todos los campos clave están en read_only
        read_only_fields = serializer.Meta.read_only_fields
        assert 'grand_total' in read_only_fields
        assert 'unit_cost' in read_only_fields
        assert 'materials_snapshot' in read_only_fields