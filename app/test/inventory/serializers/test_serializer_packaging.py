import pytest
from inventory.serializers.packaging_material_serializer import PackagingMaterialSerializer


@pytest.mark.django_db
class TestPackagingSerializers:

    # --- PACKAGING SERIALIZER ---
    def test_packaging_serializer_sanitization(self, supplier):
        """Happy Path: El serializer debe limpiar y normalizar strings"""
        data = {
            "name": "  botella bordelesa  ",
            "supplier": supplier.id,
            "packaging_type": "VIDRIO",
            "color": "  verde musgo  ",
            "unit_mesure": "UNIDAD",
            "min_stock_level": 500
        }
        serializer = PackagingMaterialSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data['name'] == "BOTELLA BORDELESA"
        assert serializer.validated_data['color'] == "VERDE MUSGO"

    def test_internal_code_is_read_only(self, packaging_material):
        """Seguridad: El internal_code no puede ser inyectado desde el exterior"""
        old_code = packaging_material.internal_code
        data = {
            "internal_code": "FORGED-CODE-666",
            "name": "NUEVO NOMBRE"
        }
        # Update parcial (PATCH)
        serializer = PackagingMaterialSerializer(
            instance=packaging_material, 
            data=data, 
            partial=True
        )
        assert serializer.is_valid()
        serializer.save()
        
        packaging_material.refresh_from_db()
        # El nombre cambia, pero el código sigue siendo el original autogenerado
        assert packaging_material.name == "NUEVO NOMBRE"
        assert packaging_material.internal_code == old_code