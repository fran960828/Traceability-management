from decimal import Decimal

from rest_framework import serializers

from production_record.models import ProductionEnologicalItem


class ProductionEnologicalItemSerializer(serializers.ModelSerializer):
    material_name = serializers.ReadOnlyField(source="material.name")
    quantity_used = serializers.DecimalField(
        max_digits=10,
        decimal_places=3,
        min_value=Decimal("0.001"),  # <--- Cambia el float por Decimal
    )
    dosage_per_liter = serializers.SerializerMethodField()

    class Meta:
        model = ProductionEnologicalItem
        fields = [
            "id",
            "material",
            "material_name",
            "quantity_used",
            "dosage_per_liter",
        ]

    def validate_quantity_used(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "La cantidad usada debe ser mayor a cero."
            )
        return value

    def get_dosage_per_liter(self, obj):
        total_liters = obj.production_order.total_liters
        if total_liters > 0:
            # Retornamos la dosis (ej: 0.010 kg/L)
            return (obj.quantity_used / total_liters).quantize(Decimal("0.000001"))
        return Decimal("0.000")
