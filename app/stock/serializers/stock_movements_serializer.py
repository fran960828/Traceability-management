from rest_framework import serializers
from stock.models import StockMovement

class StockMovementSerializer(serializers.ModelSerializer):
    # Campos informativos de solo lectura para el Frontend
    batch_number = serializers.ReadOnlyField(source='batch.batch_number')
    location_name = serializers.ReadOnlyField(source='location.name')
    user_full_name = serializers.ReadOnlyField(source='user.get_full_name')
    
    # Para saber qué producto se movió sin hacer otro GET
    product_name = serializers.SerializerMethodField()

    class Meta:
        model = StockMovement
        fields = [
            'id', 'batch', 'batch_number', 'product_name', 
            'location', 'location_name', 'quantity', 
            'movement_type', 'reference_po', 'user', 
            'user_full_name', 'created_at', 'notes'
        ]
        # Todo lo que no sea 'quantity', 'batch', 'location' y 'notes' suele ser de solo lectura
        read_only_fields = ['id', 'created_at', 'user','movement_type']

    def get_product_name(self, obj):
        """
        Lógica para obtener el nombre del producto sea cual sea su tipo.
        """
        item = obj.batch.order_item
        if item.packaging:
            return item.packaging.name
        if item.enological:
            return item.enological.name
        if item.label:
            return item.label.name
        return "Producto no identificado"
    
    def validate_quantity(self, value):
        """
        Incluso en un ajuste manual, la cantidad 0 no tiene sentido.
        """
        if value == 0:
            raise serializers.ValidationError("La cantidad no puede ser cero.")
        return value