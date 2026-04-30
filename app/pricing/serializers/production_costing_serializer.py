from decimal import Decimal

from rest_framework import serializers

from pricing.models import ProductionCosting


class ProductionCostingSerializer(serializers.ModelSerializer):
    order_lot = serializers.ReadOnlyField(source='production_order.lot_number')
    wine_name = serializers.ReadOnlyField(source='production_order.wine.name')
    materials_snapshot = serializers.JSONField(read_only=True)

    class Meta:
        model = ProductionCosting
        fields = [
            'id', 'production_order', 'order_lot', 'wine_name',
            'materials_snapshot', 'total_material_cost',
            'total_indirect_cost', 'grand_total', 'unit_cost', 'created_at'
        ]
        read_only_fields = fields

    def to_representation(self, instance):
        # 1. Obtenemos la representación base
        ret = super().to_representation(instance)

        # 2. Campos monetarios principales
        money_fields = [
            'total_material_cost', 
            'total_indirect_cost', 
            'grand_total', 
            'unit_cost'
        ]

        for field in money_fields:
            if field in ret and ret[field] is not None:
                # Forzamos conversión a string con 2 decimales
                ret[field] = "{:.2f}".format(Decimal(str(ret[field])))

        # 3. Redondeo del Snapshot (la parte que te fallaba en el PDB)
        if 'materials_snapshot' in ret and isinstance(ret['materials_snapshot'], dict):
            # Creamos un nuevo diccionario para no mutar mientras iteramos
            new_snapshot = {}
            for mat_name, data in ret['materials_snapshot'].items():
                # Copiamos los datos para no perder IDs o unidades
                formatted_data = data.copy()
                if 'unit_price' in formatted_data:
                    formatted_data['unit_price'] = "{:.2f}".format(Decimal(str(formatted_data['unit_price'])))
                if 'total_cost' in formatted_data:
                    formatted_data['total_cost'] = "{:.2f}".format(Decimal(str(formatted_data['total_cost'])))
                
                new_snapshot[mat_name] = formatted_data
            
            ret['materials_snapshot'] = new_snapshot

        return ret

    