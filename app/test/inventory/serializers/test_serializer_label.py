import pytest

from inventory.serializers.label_material_serializer import \
    LabelMaterialSerializer


@pytest.mark.django_db
class TestLabelSerializers:
    # --- LABEL SERIALIZER ---
    def test_label_serializer_sanitization(self, supplier):
        """
        Happy Path: El nombre es obligatorio, pero el serializer debe
        limpiar los espacios y pasarlo a mayúsculas.
        """
        data = {
            "name": "   tinto reserva   ",  # Enviamos con espacios y minúsculas
            "supplier": supplier.id,
            "label_type": "CONTRA",
            "brand_reference": "  Hacienda Real  ",
            "vintage": 2024,
            "unit_mesure": "MILLAR",
            "min_stock_level": 5,
        }
        serializer = LabelMaterialSerializer(data=data)

        # 1. Validamos que pase (porque el nombre no está vacío)
        assert serializer.is_valid(), serializer.errors

        # 2. Verificamos que la limpieza se haya ejecutado
        assert serializer.validated_data["name"] == "TINTO RESERVA"
        assert serializer.validated_data["brand_reference"] == "HACIENDA REAL"

    def test_label_serializer_name_mandatory(self, supplier):
        """
        Edge Case: Si el nombre se envía vacío o solo con espacios, debe fallar.
        """
        data = {
            "name": "   ",  # Solo espacios, cuenta como vacío tras el strip
            "supplier": supplier.id,
            "label_type": "CONTRA",
            "brand_reference": "Hacienda Real",
            "vintage": 2024,
            "unit_mesure": "MILLAR",
            "min_stock_level": 5,
        }
        serializer = LabelMaterialSerializer(data=data)

        # Debe fallar porque el campo es obligatorio
        assert not serializer.is_valid()
        assert "name" in serializer.errors

    def test_label_vintage_range_validation(self, supplier):
        """Edge Case: El serializer debe respetar los validadores del modelo (Añada)"""
        data = {
            "name": "ETIQUETA TEST",
            "supplier": supplier.id,
            "label_type": "FRONTAL",
            "brand_reference": "TEST",
            "vintage": 1850,  # Año fuera de rango (Min 1900)
            "unit_mesure": "MILLAR",
            "min_stock_level": 1,
        }
        serializer = LabelMaterialSerializer(data=data)
        assert not serializer.is_valid()
        assert "vintage" in serializer.errors
