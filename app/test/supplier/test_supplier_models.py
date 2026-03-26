import pytest
from django.db import IntegrityError
from django.utils import timezone


@pytest.mark.django_db
def test_supplier_auto_code_generation(supplier_factory):
    """Verifica que el código PROV-YYYY-00X se genera correctamente"""
    year = timezone.now().year

    # 1. Creamos el primer proveedor del año
    s1 = supplier_factory(name="Proveedor A", tax_id="11111111A")
    # 2. Creamos el segundo proveedor del año
    s2 = supplier_factory(name="Proveedor B", tax_id="22222222B")

    # Comprobamos el formato y la secuencia
    assert s1.supplier_code == f"PROV-{year}-001"
    assert s2.supplier_code == f"PROV-{year}-002"


@pytest.mark.django_db
def test_supplier_tax_id_uniqueness(supplier_factory):
    """Verifica que no se pueden repetir NIF/CIF (IntegrityError)"""
    # Creamos el primero
    supplier_factory(tax_id="B12345678")

    # Intentar crear otro con el mismo tax_id debe fallar en la DB
    with pytest.raises(IntegrityError):
        supplier_factory(tax_id="B12345678")


@pytest.mark.django_db
def test_category_str_representation(category_factory):
    """Verifica que el método __str__ de Category es correcto"""
    cat = category_factory(name="Embalajes")
    assert str(cat) == "Embalajes"


@pytest.mark.django_db
def test_supplier_str_representation(supplier_factory):
    """Verifica que el método __str__ de Supplier incluye el código y el nombre"""
    s = supplier_factory(name="Vidrios Ontalba")
    # El código será PROV-2026-001 (o el que toque)
    assert "Vidrios Ontalba" in str(s)
    assert "PROV-" in str(s)
