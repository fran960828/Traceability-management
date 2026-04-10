from django.db.models import Sum
from rest_framework import serializers
from stock.models import Batch, Location, StockMovement

class StockTransferSerializer(serializers.Serializer):
    batch = serializers.PrimaryKeyRelatedField(queryset=Batch.objects.all())
    origin_location = serializers.PrimaryKeyRelatedField(queryset=Location.objects.all())
    destination_location = serializers.PrimaryKeyRelatedField(queryset=Location.objects.all())
    quantity = serializers.IntegerField(min_value=1)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        batch = data['batch']
        origin = data['origin_location']
        dest = data['destination_location']
        qty_to_move = data['quantity']

        # 1. Evitar transferencia a la misma ubicación
        if origin == dest:
            raise serializers.ValidationError(
                {"destination_location": "La ubicación de destino no puede ser igual a la de origen."}
            )

        # 2. Calcular stock actual en el origen
        # Sumamos todas las cantidades (IN, OUT, ADJ) de este lote en esta ubicación
        current_stock = StockMovement.objects.filter(
            batch=batch, 
            location=origin
        ).aggregate(total=Sum('quantity'))['total'] or 0

        # 3. Validar si hay suficiente
        if qty_to_move > current_stock:
            raise serializers.ValidationError({
                "quantity": f"Stock insuficiente en {origin.name}. "
                            f"Disponible: {current_stock}, Intentado: {qty_to_move}"
            })

        return data