import pytest

from inventory.serializers.enological_material_serializer import (
    EnologicalMaterialSerializer,
)


@pytest.mark.django_db
class TestEnologicalSerializers:

    # --- ENOLOGICAL SERIALIZER ---
    def test_enological_unit_restriction(self, supplier):
        """Edge Case: Los enológicos NO pueden medirse en UNIDADES (Regla de negocio)"""
        data = {
            "name": "LEVADURA SECA",
            "supplier": supplier.id,
            "enological_type": "ESTABILIZANTE",
            "unit_mesure": "UNIDAD",  # Esto debería disparar el error en el validate()
            "min_stock_level": 10,
        }
        serializer = EnologicalMaterialSerializer(data=data)
        assert not serializer.is_valid()
        assert "unit_mesure" in serializer.errors
        assert (
            "Los productos enológicos no suelen medirse por unidades simples. Revise si debe usar KG o LITRO."
            in str(serializer.errors["unit_mesure"][0])
        )
