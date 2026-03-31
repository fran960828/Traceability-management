from rest_framework import serializers

from utils.validators import clean_whitespace

from ..models.enological_material_model import EnologicalMaterialModel


class EnologicalMaterialSerializer(serializers.ModelSerializer):
    # Campos calculados (mágicos de Django) para la interfaz
    enological_type_display = serializers.CharField(
        source="get_enological_type_display", read_only=True
    )
    unit_mesure_display = serializers.CharField(
        source="get_unit_mesure_display", read_only=True
    )

    class Meta:
        model = EnologicalMaterialModel
        fields = [
            "id",
            "internal_code",
            "name",
            "supplier",
            "enological_type",
            "enological_type_display",
            "commercial_format",
            "unit_mesure",
            "unit_mesure_display",
            "min_stock_level",
            "is_active",
            "description",
            "created_at",
            "updated_at",
        ]
        # Protegemos los campos automáticos
        read_only_fields = ["internal_code", "created_at", "updated_at"]

    def validate_name(self, value):
        """Sanitización del nombre del producto (ej: Ácido Tartárico)"""
        if value:
            return clean_whitespace(value).upper()
        return value

    def validate_commercial_format(self, value):
        """Normalización del formato (ej: SACO 25KG)"""
        if value:
            return clean_whitespace(value).upper()
        return value

    def validate(self, data):
        """
        Espacio para validaciones cruzadas.
        Ejemplo: Asegurar que si es un conservante, la UOM sea KG o LITRO, no UNIDAD.
        """
        uom = data.get("unit_mesure")
        if uom == "UNIDAD":
            raise serializers.ValidationError(
                {
                    "unit_mesure": "Los productos enológicos no suelen medirse por unidades"
                }
            )
        return data
