from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from purchase.models import PurchaseOrderItem

class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    # Campo de solo lectura para mostrar el nombre del material en el JSON de respuesta
    material_name = serializers.ReadOnlyField()

    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id', 'purchase_order','packaging', 'label', 'enological', 
            'quantity_ordered', 'quantity_received', 
            'unit_price', 'material_name'
        ]
        read_only_fields = ['purchase_order']
    def validate(self, attrs):
        """
        Llamamos al full_clean del modelo para reutilizar la lógica de 'Solo un material'
        y el bloqueo de precios negativos.
        """
        instance = PurchaseOrderItem(**attrs)
        try:
            instance.clean()
        except DjangoValidationError as e:
            error_data = getattr(e, "message_dict", e.messages)
            raise serializers.ValidationError(error_data)
        return attrs


