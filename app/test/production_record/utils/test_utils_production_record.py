import pytest
from django.core.exceptions import ValidationError

from production_record.utils import validate_production_volume_integrity


def test_validate_volume_integrity_success():
    """No debe lanzar error si los litros extraídos >= total embotellado."""
    # Caso igual
    validate_production_volume_integrity(total_liters=750, bulk_liters_withdrawn=750)
    # Caso mayor (merma normal)
    validate_production_volume_integrity(total_liters=750, bulk_liters_withdrawn=760)


def test_validate_volume_integrity_fails_when_less():
    """Debe lanzar ValidationError si se intenta embotellar más de lo extraído."""
    with pytest.raises(ValidationError) as excinfo:
        validate_production_volume_integrity(
            total_liters=750, bulk_liters_withdrawn=740
        )

    # Verificamos que el error apunta al campo correcto si usamos diccionario
    assert "bulk_liters_withdrawn" in excinfo.value.message_dict
    assert "no pueden ser menores" in str(excinfo.value)


def test_validate_volume_integrity_handles_none():
    """No debe lanzar error si alguno de los valores es None (evita crashes)."""
    validate_production_volume_integrity(total_liters=None, bulk_liters_withdrawn=750)
    validate_production_volume_integrity(total_liters=750, bulk_liters_withdrawn=None)
