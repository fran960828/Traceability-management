import pytest

from supplier.serializers import SupplierSerializer


@pytest.mark.django_db
def test_supplier_serializer_sanitization(category_factory):
    # Usamos la factory para tener una categoría válida
    cat = category_factory(name="Corchos")

    input_data = {
        "name": "  Corchos Ontalba S.L.  ",
        "tax_id": "  b02555666  ",
        "phone": "  967001122  ",
        "category": cat.id,
        "email_pedidos": "pedidos@corchos.com",
    }

    serializer = SupplierSerializer(data=input_data)
    assert serializer.is_valid(), serializer.errors

    # Verificamos que el serializador ha hecho su trabajo de limpieza
    data = serializer.validated_data
    assert data["name"] == "Corchos Ontalba S.L."
    assert data["tax_id"] == "B02555666"  # Mayúsculas y sin espacios
    assert data["phone"] == "967001122"


@pytest.mark.django_db
def test_supplier_serializer_invalid_phone(category_factory):
    cat = category_factory()

    input_data = {
        "name": "Proveedor Error",
        "tax_id": "F02004141",
        "phone": "664537474",  # Formato incorrecto (no tiene 9)
        "category": cat.id,
        "email_pedidos": "error@test.com",
    }

    serializer = SupplierSerializer(data=input_data)

    # Debe fallar
    assert not serializer.is_valid()
    # Verificamos que el error está en el campo 'phone'
    assert "phone" in serializer.errors
