import pytest
from stock.serializers import LocationSerializer
from test.stock.factories import LocationFactory

@pytest.mark.django_db
class TestLocationSerializer:

    def test_location_serializer_happy_path(self):
        """HAPPY PATH: Los datos válidos se serializan correctamente."""
        data = {"name": "ALMACEN_TEST", "description": "Descripción de prueba"}
        serializer = LocationSerializer(data=data)
        assert serializer.is_valid()
        location = serializer.save()
        assert location.name == "ALMACEN_TEST"

    def test_location_serializer_normalization(self):
        """VALIDACIÓN: El serializer debe respetar la normalización del modelo."""
        data = {"name": "  zona de carga  "}
        serializer = LocationSerializer(data=data)
        assert serializer.is_valid()
        location = serializer.save()
        assert location.name == "ZONA_DE_CARGA"

    def test_location_serializer_unique_name(self):
        """EDGE CASE: El serializer detecta nombres duplicados automáticamente."""
        LocationFactory(name="ALMACEN_A")
        data = {"name": "ALMACEN_A"} # Al normalizar será igual
        serializer = LocationSerializer(data=data)
        assert not serializer.is_valid()
        assert 'name' in serializer.errors