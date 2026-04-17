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
    current_stock = serializers.ReadOnlyField()
    is_low_stock = serializers.ReadOnlyField()

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
            "capacity",
            "created_at",
            "updated_at",
            "current_stock",
            "is_low_stock",
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
        """
        Validación cruzada para asegurar coherencia entre el tipo de material,
        la capacidad y el color.
        """
        # 1. Recuperamos los valores de la petición o del objeto existente (para PATCH)
        # Esto asegura que si solo actualizas el color, sepamos de qué tipo es el material
        p_type = data.get(
            "packaging_type", getattr(self.instance, "packaging_type", None)
        )
        capacity = data.get("capacity", getattr(self.instance, "capacity", None))
        color = data.get("color", getattr(self.instance, "color", None))

        # 2. Validación de Unidad de Medida (Existente)
        if "unit_mesure" in data:
            if data.get("unit_mesure") != "UNIDAD":
                raise serializers.ValidationError(
                    {
                        "unit_mesure": "Los materiales de acondicionamiento deben medirse en UNIDAD."
                    }
                )

        # 3. Validación de Capacidad (Solo para contenedores)
        # Definimos qué tipos son considerados envases de líquido
        container_types = ["VIDRIO", "BIB", "GARRAFA"]
        if capacity is not None and p_type not in container_types:
            raise serializers.ValidationError(
                {
                    "capacity": f"La capacidad solo se permite en envases ({', '.join(container_types)})."
                }
            )

        # 4. Validación de Color (Solo para vidrio o cápsulas)
        color_types = ["VIDRIO", "CAPSULA"]
        if color and p_type not in color_types:
            raise serializers.ValidationError(
                {"color": "El color solo es aplicable a botellas o cápsulas."}
            )

        return data
