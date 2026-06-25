from rest_framework import serializers
from stock.models import Batch


class BatchSerializer(serializers.ModelSerializer):
    # 🔹 Propiedades calculadas expuestas de forma directa desde el modelo
    product_name = serializers.ReadOnlyField(source="material_name")
    supplier_name = serializers.ReadOnlyField(source="supplier.name")
    
    # 🔹 Ubicación actual resuelta a través de su último movimiento
    location = serializers.SerializerMethodField()
    location_name = serializers.SerializerMethodField()

    # 🔹 Formato amigable del estado operativo (Choices)
    stock_status_display = serializers.CharField(
        source="get_stock_status_display", read_only=True
    )

    class Meta:
        model = Batch
        fields = [
            "id",
            "batch_number",
            "product_name",
            "supplier_name",
            "location",
            "location_name",
            "current_stock_cache",  # Mapea directamente el saldo del caché recalculado por la signal
            "stock_status",
            "stock_status_display",
            "arrival_date",
            "expiry_date",
        ]
        # 🔒 Blindaje absoluto: Al ser de solo lectura, marcamos todos los campos como Read Only
        read_only_fields = fields

    def get_location(self, obj):
        """
        🎯 OPTIMIZACIÓN DE TRAZABILIDAD:
        Obtiene el ID de la ubicación real donde descansa el lote basándose
        en el último movimiento registrado en el libro diario.
        """
        # Usamos .movements debido al related_name o la relación del modelo StockMovement hacia Batch
        last_movement = obj.movements.only("location_id").order_by("-id").first()
        return last_movement.location_id if last_movement else None

    def get_location_name(self, obj):
        """
        Obtiene el nombre en texto legible de la zona física actual.
        """
        last_movement = obj.movements.select_related("location").only("location__name").order_by("-id").first()
        return last_movement.location.name if last_movement and last_movement.location else "Sin Ubicación"