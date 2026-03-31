import pytest
from django.db.models.deletion import ProtectedError  # Importación clave


@pytest.mark.django_db
class TestPackagingMaterialModel:

    def test_packaging_happy_path(self, packaging_factory):
        """Happy Path: Creación estándar y sanitización"""
        material = packaging_factory(
            name="  botella bordelesa  ", color="  verde musgo  "
        )
        assert material.name == "BOTELLA BORDELESA"
        assert material.color == "VERDE MUSGO"
        assert material.internal_code.startswith("PAC-")

    def test_internal_code_increment(self, packaging_factory):
        """Edge Case: Verificación de autoincremento secuencial"""
        m1 = packaging_factory()
        m2 = packaging_factory()

        num1 = int(m1.internal_code.split("-")[-1])
        num2 = int(m2.internal_code.split("-")[-1])
        assert num2 == num1 + 1

    def test_str_method(self, packaging_factory):
        """Prueba la representación en cadena"""
        material = packaging_factory(name="CORCHO NAT")
        assert str(material) == f"{material.internal_code} | CORCHO NAT"

    def test_on_delete_supplier_protection(self, supplier, packaging_factory):
        """
        Integridad: No se puede borrar un proveedor si tiene materiales vinculados.
        Este test verifica que on_delete=models.PROTECT funciona.
        """
        # 1. Creamos un material vinculado al proveedor de la fixture
        packaging_factory(supplier=supplier)

        # 2. Intentamos borrar y esperamos el error de protección
        with pytest.raises(ProtectedError):
            supplier.delete()

        # 3. Verificamos que el proveedor SIGUE existiendo en la DB
        supplier.refresh_from_db()
        assert supplier.id is not None
