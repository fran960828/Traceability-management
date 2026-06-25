from rest_framework import serializers
from stock.models import Batch, Location, StockMovement

class StockAdjustmentSerializer(serializers.ModelSerializer):
    # Forzamos a que el lote y la ubicación sean obligatorios en el payload
    batch = serializers.PrimaryKeyRelatedField(queryset=Batch.objects.all())
    location = serializers.PrimaryKeyRelatedField(queryset=Location.objects.all())
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3)

    class Meta:
        model = StockMovement
        fields = ["id","user","batch", "location", "quantity", "notes"]
        read_only_fields = ["id", "user"]

    def validate_quantity(self, value):
        """La cantidad cero no altera el inventario."""
        if value == 0:
            raise serializers.ValidationError("La cantidad del ajuste no puede ser cero.")
        return value

    def validate(self, data):
        batch = data["batch"]
        quantity_requested = data["quantity"]

        # 🟢 1. REGLA DE SEGURIDAD: Bloquear ajustes si el lote ya está completamente agotado
        if batch.stock_status == Batch.StockStatus.DEPLETED and quantity_requested < 0:
            raise serializers.ValidationError(
                {
                    "batch": f"Operación rechazada. El lote {batch.batch_number} está AGOTADO en el sistema."
                }
            )

        # 🟢 2. CERROJO DE STOCK NEGATIVO (MERMAS)
        # Si la cantidad es negativa, es una salida/merma y no puede superar lo que hay disponible
        if quantity_requested < 0:
            # Usamos el stock memorizado en el caché del lote
            stock_disponible = batch.current_stock_cache
            abs_requested = abs(quantity_requested)

            if abs_requested > stock_disponible:
                raise serializers.ValidationError(
                    {
                        "quantity": (
                            f"Movimiento denegado por falta de existencias. "
                            f"Saldo disponible en bodega: {stock_disponible:.2f} uds. "
                            f"Intentado retirar: {abs_requested:.2f} uds."
                        )
                    }
                )

        return data