from rest_framework import serializers
from stock.models import Location
from purchase.models import PurchaseOrderItem

class GoodsReceptionItemSerializer(serializers.Serializer):
    """Representa una línea individual de recepción en el camión."""
    order_item = serializers.PrimaryKeyRelatedField(queryset=PurchaseOrderItem.objects.all())
    location = serializers.PrimaryKeyRelatedField(queryset=Location.objects.all())
    batch_number = serializers.CharField(max_length=50)
    quantity = serializers.IntegerField(min_value=1)
    expiry_date = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    def validate(self, data):
        """
        Validación cruzada entre campos.
        """
        item = data['order_item']
        po = item.purchase_order

        # 1. Validar estado de la PO
        if po.status in ['CANCELLED', 'CLOSED']:
            raise serializers.ValidationError(
                f"No se puede recibir mercancía para una orden en estado {po.status}."
            )

        # 2. Validar que no se reciba más de lo pendiente (Margen de error opcional)
        pending = item.quantity_ordered - item.quantity_received
        if data['quantity'] > pending:
            raise serializers.ValidationError(
                f"Cantidad excedida. Cantidad pendiente: {pending}. Intentado: {data['quantity']}"
            )

        return data