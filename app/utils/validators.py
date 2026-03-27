# utils/validators.py
from django.core.validators import RegexValidator

# 1. Validador de NIF/CIF (Formato español estándar)
tax_id_validator = RegexValidator(
    regex=r"^[A-Z0-9][0-9]{7}[A-Z0-9]$",
    message="El NIF/CIF debe tener 9 caracteres y un formato válido (ej: A1234567B).",
)

# 2. Validador de Teléfono (Estándar E.164 para análisis internacional)
phone_validator = RegexValidator(
    regex=r"^\+?1?\d{9,15}$",
    message="El teléfono debe incluir prefijo internacional (ej: +34600123123) y tener entre 9 y 15 dígitos.",
)


# 3. Función de utilidad para limpiar strings (Sanitización proactiva)
def clean_whitespace(value):
    """Elimina espacios extra al principio, final y duplicados internos."""
    if not isinstance(value, str):
        return value
    return " ".join(value.split())


def sanitize_upper_strip(value):
    if not value:
        return value
    return value.strip().upper()
