from rest_framework import serializers
from stock.models import StockMovement


class StockMovementSerializer(serializers.ModelSerializer):
    # 🔹 Campos informativos extraídos mediante relaciones cruzadas (Joins)
    batch_number = serializers.ReadOnlyField(source="batch.batch_number")
    location_name = serializers.ReadOnlyField(source="location.name")
    user_full_name = serializers.ReadOnlyField(source="user.get_full_name")
    batch_current_stock = serializers.ReadOnlyField(source="batch.current_stock_cache")
    batch_stock_status = serializers.ReadOnlyField(source="batch.stock_status")

    # 🔹 Formato amigable de la naturaleza del movimiento (ej: "Entrada (Compra/Recepciones)")
    movement_type_display = serializers.CharField(
        source="get_movement_type_display", read_only=True
    )

    # 🔹 Nombre del artículo/insumo implicado
    product_name = serializers.SerializerMethodField()

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "batch",
            "batch_number",
            "product_name",
            "location",
            "location_name",
            "batch_current_stock",
            "batch_stock_status",
            "quantity",
            "movement_type",
            "movement_type_display",  
            "reference_po",
            "user",
            "user_full_name",
            "created_at",
            "notes",
        ]
        # 🔒 Al ser un serializador puro de lectura, marcamos absolutamente todo como Read Only
        read_only_fields = fields

    def get_product_name(self, obj):
        """
        🎯 OPTIMIZACIÓN INDUSTRIAL:
        Antes de consultar la base de datos cruzando tablas de materiales,
        comprobamos si el modelo Batch ya tiene el nombre cacheado en la propiedad.
        """
        try:
            return obj.batch.material_name
        except AttributeError:
            # Salvaguarda por si el lote o el item de compra no están hidratados
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
