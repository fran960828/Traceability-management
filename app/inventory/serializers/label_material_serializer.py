from rest_framework import serializers

from utils.validators import clean_whitespace

from ..models.label_material_model import LabelMaterialModel


class LabelMaterialSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    # Campos calculados para la interfaz
    label_type_display = serializers.CharField(
        source="get_label_type_display", read_only=True
    )
    unit_mesure_display = serializers.CharField(
        source="get_unit_mesure_display", read_only=True
    )
    current_stock = serializers.ReadOnlyField()
    is_low_stock = serializers.ReadOnlyField()

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
            "current_stock",
            "is_low_stock",
        ]
        read_only_fields = ["internal_code", "created_at", "updated_at"]
    
    def get_name(self, obj):
        """
        Combina los datos técnicos para que el desplegable del vino sea ultra explícito.
        Resultado: "ONTALBA CRIANZA SELECCIÓN [FRONTAL - 2026]"
        """
        tipo_texto = obj.get_label_type_display() or "ETIQUETA"
        # Si tienes la marca (brand_reference) la ponemos delante, sino usamos el nombre base
        marca = obj.brand_reference if obj.brand_reference else obj.name
        return f"{marca} [{tipo_texto} - {obj.vintage}]"

    def validate_brand_reference(self, value):
        """Sanitización de la marca (aunque venga de un Enum en FE)"""
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
        if "name" in self.initial_data:
            nombre_sucio = self.initial_data.get("name")
            if nombre_sucio:
                data["name"] = clean_whitespace(str(nombre_sucio)).upper()

        return data
