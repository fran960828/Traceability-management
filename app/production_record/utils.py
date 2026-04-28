from django.core.exceptions import ValidationError


def validate_production_volume_integrity(total_liters, bulk_liters_withdrawn):
    """
    Comprueba que el vino extraído sea suficiente para el embotellado.
    """
    if bulk_liters_withdrawn is not None and total_liters is not None:
        if bulk_liters_withdrawn < total_liters:
            raise ValidationError(
                {
                    "bulk_liters_withdrawn": (
                        f"Los litros extraídos ({bulk_liters_withdrawn}L) "
                        f"no pueden ser menores al volumen embotellado ({total_liters}L)."
                    )
                }
            )
