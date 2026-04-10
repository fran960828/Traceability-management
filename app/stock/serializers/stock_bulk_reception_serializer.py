from rest_framework import serializers
from django.db import transaction
from stock.models import Batch, StockMovement
from .stock_good_reception_serializer import GoodsReceptionItemSerializer


class BulkReceptionSerializer(serializers.Serializer):
    """Contenedor para recibir múltiples materiales de un solo golpe."""
    items = GoodsReceptionItemSerializer(many=True)

    def validate_items(self, value):
        """
        Validación a nivel de lista completa.
        """
        # 3. Validar lotes duplicados en el mismo envío
        batch_numbers = [item['batch_number'] for item in value]
        if len(batch_numbers) != len(set(batch_numbers)):
            raise serializers.ValidationError("Hay números de lote duplicados en esta recepción.")
        
        if len(batch_numbers) == 0:
            raise serializers.ValidationError("El numero de items debe ser mayor de 0")
        
        return value
    
    def create(self, validated_data):
        items_data = validated_data.get('items')
        movements_created = []
        user = self.context['request'].user

        # ATOMICIDAD: O entran todos los palets o no entra ninguno.
        with transaction.atomic():
            for item in items_data:
                # 1. Gestión del Lote (Crear o recuperar si ya existe)
                batch, _ = Batch.objects.get_or_create(
                    batch_number=item['batch_number'].strip().replace(" ", ""),
                    order_item=item['order_item'],
                    defaults={'expiry_date': item.get('expiry_date')}
                )

                # 2. Creación del Movimiento de Stock
                movement = StockMovement.objects.create(
                    batch=batch,
                    location=item['location'],
                    quantity=item['quantity'],
                    movement_type=StockMovement.MovementType.IN,
                    user=user,
                    reference_po=item['order_item'].purchase_order,
                    notes=item.get('notes', '')
                )
                movements_created.append(movement)

        return {"movements": movements_created}
    