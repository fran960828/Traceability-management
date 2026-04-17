from test.stock.factories import BatchFactory

import pytest
from django.core.exceptions import ValidationError

from stock.models import Batch


@pytest.mark.django_db
class TestBatchModel:

    # --- HAPPY PATH ---
    def test_batch_creation_is_successful(self, batch_con_po):
        """HAPPY PATH: Crear un lote vinculado a un item de pedido con éxito."""
        batch = batch_con_po
        assert batch.id is not None
        assert "LOT-" in batch.batch_number
        # Verificamos que las propiedades funcionen
        assert batch.supplier is not None
        assert batch.material_name is not None
        assert str(batch) == f"Lote: {batch.batch_number} | {batch.material_name}"

    # --- VALIDACIONES Y LIMPIEZA (CLEAN) ---
    def test_batch_number_strips_and_removes_spaces(self):
        """VALIDACIÓN: El número de lote debe eliminar espacios pero MANTENER capitalización."""
        # Caso: Espacios al inicio, final e intermedios con mezcla de mayúsculas/minúsculas
        batch = BatchFactory(batch_number="  lot - 2026 - Abc  ")
        # Debería quedar: lot-2026-Abc
        assert batch.batch_number == "lot-2026-Abc"

    def test_batch_number_unique_constraint(self):
        """VALIDACIÓN: No pueden existir dos lotes con el mismo número."""
        BatchFactory(batch_number="LOTE_UNICO")
        duplicate = BatchFactory.build(
            batch_number="  LOTE_UNICO  "
        )  # .build() no guarda en DB

        with pytest.raises(ValidationError):
            duplicate.save()

    # --- RELACIONES Y PROPIEDADES ---
    def test_batch_properties_access_correct_data(
        self, purchase_order_item_factory, packaging_factory
    ):
        """HAPPY PATH: Las propiedades deben devolver los datos reales del pedido original."""
        pack = packaging_factory(name="BOTELLA BORDELÉSA")
        item = purchase_order_item_factory(packaging=pack)
        batch = BatchFactory(order_item=item, batch_number="B-100")

        assert batch.material_name == "BOTELLA BORDELÉSA"
        assert batch.supplier == item.purchase_order.supplier

    # --- EDGE CASES ---
    def test_batch_without_order_item_fails(self):
        """EDGE CASE: Un lote no puede existir sin estar vinculado a una línea de pedido."""
        batch = Batch(batch_number="LOTE_HUERFANO")
        with pytest.raises(ValidationError):
            batch.save()

    def test_batch_expiry_date_can_be_null(self, batch_con_po):
        """EDGE CASE: La fecha de caducidad es opcional (muchos packagings no la tienen)."""
        batch = batch_con_po
        batch.expiry_date = None
        batch.save()  # No debe lanzar error
        assert batch.expiry_date is None
