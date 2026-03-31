from rest_framework import serializers

from utils.validators import clean_whitespace

from ..models.label_material_model import LabelMaterialModel


class LabelMaterialSerializer(serializers.ModelSerializer):
    # Campos calculados para la interfaz
    label_type_display = serializers.CharField(
        source="get_label_type_display", read_only=True
    )
    unit_mesure_display = serializers.CharField(
        source="get_unit_mesure_display", read_only=True
    )

    class Meta:
        model = LabelMaterialModel
        fields = [
            "id",
            "internal_code",
            "name",
            "supplier",
            "label_type",
            "label_type_display",
            "brand_reference",
            "vintage",
            "unit_mesure",
            "unit_mesure_display",
            "min_stock_level",
            "is_active",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["internal_code", "created_at", "updated_at"]

    def validate_brand_reference(self, value):
        """Sanitización de la marca (aunque venga de un Enum en FE)"""
        if value:
            return clean_whitespace(value).upper()
        return value

    def validate_name(self, value):
        """Sanitización del nombre"""
        if value:
            return clean_whitespace(value).upper()
        return value

    def validate(self, data):
        # 1. Validación de Unidad de Medida
        if "unit_mesure" in data:
            uom = data.get("unit_mesure")
            if uom not in ["UNIDAD", "MILLAR"]:
                raise serializers.ValidationError(
                    {
                        "unit_mesure": "Las etiquetas solo pueden medirse en UNIDAD o MILLAR."
                    }
                )

        return data
