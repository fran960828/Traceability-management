from rest_framework import serializers

from utils.validators import clean_whitespace

from ..models.packaging_material_model import PackagingMaterialModel


class PackagingMaterialSerializer(serializers.ModelSerializer):
    # Campos calculados para facilitar la lectura en el Frontend
    # En los campos calculado source llama a una función interna de django que nos proporciona al usar choices
    # la función es get_NOMBRE_CAMPO_display, y proporciona el nombre largo pero no pasa a la base de datos.
    packaging_type_display = serializers.CharField(
        source="get_packaging_type_display", read_only=True
    )
    unit_mesure_display = serializers.CharField(
        source="get_unit_mesure_display", read_only=True
    )

    class Meta:
        model = PackagingMaterialModel
        fields = [
            "id",
            "internal_code",
            "name",
            "supplier",
            "packaging_type",
            "packaging_type_display",
            "specification",
            "color",
            "unit_mesure",
            "unit_mesure_display",
            "min_stock_level",
            "is_active",
            "description",
            "created_at",
            "updated_at",
        ]
        # El código interno nunca debe ser enviado por el cliente, lo genera el servidor
        read_only_fields = ["internal_code", "created_at", "updated_at"]

    def validate_name(self, value):
        """Asegura que el nombre esté limpio y en mayúsculas"""
        if value:
            return clean_whitespace(value).upper()
        return value

    def validate_specification(self, value):
        """Limpieza de especificaciones técnicas"""
        if value:
            return clean_whitespace(value).upper()
        return value

    def validate_color(self, value):
        """Normalización de colores"""
        if value:
            return clean_whitespace(value).upper()
        return value

    def validate(self, data):
        # Solo validamos si el campo viene en la petición (soporte para PATCH)
        if "unit_mesure" in data:
            uom = data.get("unit_mesure")
            if uom != "UNIDAD":
                raise serializers.ValidationError(
                    {
                        "unit_mesure": "Los materiales de acondicionamiento deben medirse en UNIDAD."
                    }
                )
        return data
