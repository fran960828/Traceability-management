import pytest

from supplier.serializers import SupplierSerializer


@pytest.mark.django_db
def test_supplier_serializer_sanitization(category_factory):
    # Usamos la factory para tener una categoría válida
    cat = category_factory(name="Corchos")

    input_data = {
        "name": "  Corchos Ontalba S.L.  ",
        # b + 7 números + z = 9 caracteres con letra al inicio y fin
        "tax_id": "  b1234567Z  ",
        "phone": "  967001122  ",
        "category": cat.id,
        "email_pedidos": "PEDIDOS@CORCHOS.COM",  # Añadimos mayúsculas para probar sanitización
    }

    serializer = SupplierSerializer(data=input_data)

    # Si falla aquí, imprimirá el error exacto de por qué el NIF no gusta
    assert serializer.is_valid(), serializer.errors

    data = serializer.validated_data

    # 1. Verificamos limpieza de espacios
    assert data["name"] == "Corchos Ontalba S.L."

    # 2. Verificamos normalización a MAYÚSCULAS (Sanitización proactiva)
    assert data["tax_id"] == "B1234567Z"

    # 3. Verificamos normalización de email a minúsculas
    assert data["email_pedidos"] == "pedidos@corchos.com"

    # 4. Verificamos limpieza de teléfono
    assert data["phone"] == "967001122"


@pytest.mark.django_db
def test_supplier_serializer_invalid_phone(category_factory):
    cat = category_factory()

    input_data = {
        "name": "Proveedor Error",
        "tax_id": "F02004141",
        "phone": "66453747",  # Formato incorrecto (no tiene 9)
        "category": cat.id,
        "email_pedidos": "error@test.com",
    }

    serializer = SupplierSerializer(data=input_data)

    # Debe fallar
    assert not serializer.is_valid()
    # Verificamos que el error está en el campo 'phone'
    assert "phone" in serializer.errors
