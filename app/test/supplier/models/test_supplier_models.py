import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone


@pytest.mark.django_db
class TestSupplierModels:

    def test_supplier_auto_code_generation(self, supplier_factory):
        """Verifica que el código PROV-YYYY-00X se genera correctamente"""
        year = timezone.now().year

        # Usamos datos que cumplan con los nuevos validadores de utils
        s1 = supplier_factory(name="Proveedor A", tax_id="A0000001Z")
        s2 = supplier_factory(name="Proveedor B", tax_id="A0000002Z")

        # Comprobamos el formato y la secuencia
        assert s1.supplier_code == f"PROV-{year}-001"
        assert s2.supplier_code == f"PROV-{year}-002"

    def test_supplier_tax_id_uniqueness(self, supplier_factory):
        """Verifica que no se pueden repetir NIF/CIF (IntegrityError)"""
        nif_duplicado = "A1234567B"

        # Creamos el primero
        supplier_factory(tax_id=nif_duplicado)

        # Intentar crear otro con el mismo tax_id debe fallar en la DB
        # Nota: Usamos IntegrityError porque la restricción es de Base de Datos (unique=True)
        with pytest.raises(ValidationError):
            supplier_factory(tax_id=nif_duplicado)

    def test_category_sanitization_to_upper(self, category_factory):
        """Verifica que el nombre de la categoría siempre se guarda en MAYÚSCULAS"""
        # Ayer pusimos en el save(): self.name = self.name.strip().upper()
        cat = category_factory(name="embalajes con espacios ")

        assert cat.name == "EMBALAJES CON ESPACIOS"
        assert str(cat) == "EMBALAJES CON ESPACIOS"

    def test_supplier_str_representation(self, supplier_factory):
        """Verifica que el método __str__ de Supplier incluye el código y el nombre"""
        # El nombre se limpia de espacios internos por nuestro validador clean_whitespace
        s = supplier_factory(name="Vidrios    Ontalba")

        assert "Vidrios Ontalba" in str(s)
        assert s.supplier_code in str(s)

    def test_invalid_tax_id_raises_error(self, supplier_factory):
        """
        Verifica que el validador de utils corta el paso a NIFs mal formados.
        Como el save() del modelo llama a full_clean(), saltará ValidationError.
        """
        with pytest.raises(ValidationError):
            # Formato incorrecto (le faltan números o letras)
            supplier_factory(tax_id="123")
