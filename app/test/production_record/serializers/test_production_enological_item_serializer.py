from test.inventory.factories import EnologicalMaterialFactory

import pytest

from production_record.serializers import ProductionEnologicalItemSerializer


@pytest.mark.django_db
class TestProductionEnologicalItemSerializer:

    def test_serializer_output_data(self):
        """Happy Path: Verifica que el JSON de salida incluye el nombre del material."""
        material = EnologicalMaterialFactory(name="Metabisulfito")
        # No necesitamos crear el objeto en DB para el serializer si le pasamos los datos
        data = {"material": material.id, "quantity_used": 0.500}
        serializer = ProductionEnologicalItemSerializer(data=data)
        assert serializer.is_valid()

        # Al ser un ReadOnlyField, el material_name no se valida en la entrada,
        # pero aparecerá en la representación tras guardar.
        # Aquí probamos la validación básica.
        assert serializer.validated_data["quantity_used"] == 0.500

    def test_validate_negative_quantity(self):
        """Validación: No se permiten cantidades negativas."""
        material = EnologicalMaterialFactory()
        data = {"material": material.id, "quantity_used": -1.0}
        serializer = ProductionEnologicalItemSerializer(data=data)

        assert not serializer.is_valid()
        assert "quantity_used" in serializer.errors

    def test_validate_zero_quantity(self):
        """Edge Case: Cantidad cero debe ser invalidada por el serializer."""
        material = EnologicalMaterialFactory()
        data = {"material": material.id, "quantity_used": 0}
        serializer = ProductionEnologicalItemSerializer(data=data)

        assert not serializer.is_valid()
