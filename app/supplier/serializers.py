from rest_framework import serializers

from supplier.models import Category, Supplier
from utils.validators import (clean_whitespace, phone_validator,
                              tax_id_validator)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name"]


class SupplierSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source="category.name")
    supplier_code = serializers.ReadOnlyField()

    class Meta:
        model = Supplier
        fields = [
            "id",
            "supplier_code",
            "name",
            "tax_id",
            "category",
            "category_name",
            "email_pedidos",
            "phone",
            "address",
            "lead_time",
            "is_active",
            "created_at",
        ]

    def validate_tax_id(self, value):
        """Sanitiza y valida el NIF/CIF usando el validador centralizado."""
        value = value.strip().upper()
        # Ejecutamos el validador de utils manualmente si queremos control extra
        tax_id_validator(value)
        return value

    def validate_email_pedidos(self, value):
        """Fuerza los emails a minúsculas (Estándar de análisis de datos)."""
        return value.strip().lower()

    def validate_phone(self, value):
        """Aplica el formato internacional si el usuario lo olvidó."""
        value = value.strip()
        # Si el usuario no puso el +, pero puso 34..., se lo ponemos nosotros
        if value.startswith("34") and len(value) == 11:
            value = f"+{value}"
        # Validamos contra el Regex de utils
        phone_validator(value)
        return value

    def validate(self, data):
        """
        Sanitización masiva de campos de texto para evitar 'espacios fantasmas'.
        """
        # 1. Campos que deben ser 'Title Case' (ej: Juan Perez) o 'Normal'
        if "name" in data:
            data["name"] = clean_whitespace(data["name"])

        if "address" in data:
            data["address"] = clean_whitespace(data["address"])

        return data
