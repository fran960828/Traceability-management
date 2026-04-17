from test.stock.factories import LocationFactory

import pytest
from django.core.exceptions import ValidationError

from stock.models import Location


@pytest.mark.django_db
class TestLocationModel:

    # --- HAPPY PATH ---
    def test_location_creation_is_successful(self):
        """HAPPY PATH: Crear una ubicación con datos válidos."""
        loc = Location.objects.create(
            name="ALMACEN_CENTRAL", description="Ubicación principal de la bodega"
        )
        assert loc.id is not None
        assert loc.name == "ALMACEN_CENTRAL"
        assert loc.is_active is True
        assert str(loc) == "ALMACEN_CENTRAL (ACTIVA)"

    # --- VALIDACIONES Y TRANSFORMACIONES (CLEAN) ---
    def test_location_name_normalization(self):
        """VALIDACIÓN: El nombre debe pasar a mayúsculas y cambiar espacios por guiones bajos."""
        # El factory usa save(), lo que dispara full_clean()
        loc = LocationFactory(name="  zona de embotellado  ")
        assert loc.name == "ZONA_DE_EMBOTELLADO"

    def test_location_name_collapses_multiple_spaces(self):
        """VALIDACIÓN: Múltiples espacios deben convertirse en un solo guion bajo."""
        loc = LocationFactory(name="ALMACEN    FRIGORIFICO")
        assert loc.name == "ALMACEN_FRIGORIFICO"

    def test_location_description_cleaning(self):
        """VALIDACIÓN: La descripción debe eliminar espacios redundantes y strips."""
        loc = LocationFactory(description="  Texto    con mucho   aire  ")
        assert loc.description == "Texto con mucho aire"

    # --- EDGE CASES / ERRORS ---
    def test_location_invalid_characters_in_name(self):
        """EDGE CASE: El nombre no debe permitir caracteres especiales."""
        loc = Location(name="ALMACEN@PROHIBIDO")
        with pytest.raises(ValidationError) as excinfo:
            loc.save()
        assert "name" in excinfo.value.message_dict
        assert (
            "El nombre solo puede contener letras, números y guiones bajos"
            in excinfo.value.message_dict["name"][0]
        )

    def test_location_unique_name_constraint(self):
        """EDGE CASE: No pueden existir dos ubicaciones con el mismo nombre (normalizado)."""
        LocationFactory(name="ALMACEN_A")
        # Intentamos crear otro que al normalizar sea igual
        duplicate_loc = Location(name="  almacen a  ")

        with pytest.raises(ValidationError):
            duplicate_loc.save()

    def test_location_empty_name_fails(self):
        """EDGE CASE: El nombre no puede ser una cadena vacía."""
        loc = Location(name="")
        with pytest.raises(ValidationError):
            loc.save()

    def test_location_status_representation(self):
        """VALIDACIÓN: Verificamos el __str__ cuando está inactiva."""
        loc = LocationFactory(name="BODEGA_VIEJA", is_active=False)
        assert str(loc) == "BODEGA_VIEJA (INACTIVA)"
