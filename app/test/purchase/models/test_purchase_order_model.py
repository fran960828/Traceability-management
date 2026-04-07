import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from purchase.models import PurchaseOrder


@pytest.mark.django_db
class TestPurchaseOrderModel:

    # --- HAPPY PATH ---
    def test_create_valid_po(self, purchase_order_factory):
        """Validar creación básica y autogeneración de campos"""
        po = purchase_order_factory(status=PurchaseOrder.Status.DRAFT)
        assert po.pk is not None
        assert po.order_number.startswith("PO-2026-")
        assert po.status == PurchaseOrder.Status.DRAFT

    def test_status_transition_to_open(self, purchase_order_factory):
        """Validar que una orden puede pasar de Borrador a Abierta"""
        po = purchase_order_factory(status=PurchaseOrder.Status.DRAFT)
        po.status = PurchaseOrder.Status.OPEN
        po.full_clean()
        po.save()
        assert po.status == PurchaseOrder.Status.OPEN

    # --- EDGE CASES & VULNERABILITIES ---
    def test_immutable_closed_order(self, purchase_order_factory):
        """VULNERABILIDAD: Impedir cambios en una orden CERRADA (Audit Trail)"""
        po = purchase_order_factory(status=PurchaseOrder.Status.CLOSED)
        po.notes = "Cambiando notas ilegalmente"

        with pytest.raises(ValidationError) as exc:
            po.full_clean()
        assert "Esta orden está CERRADA" in str(exc.value)

    def test_prevent_reopening_cancelled_order(self, purchase_order_factory):
        """EDGE CASE: Una orden cancelada no puede volver a abrirse (Integridad)"""
        po = purchase_order_factory(status=PurchaseOrder.Status.CANCELLED)
        po.status = PurchaseOrder.Status.OPEN

        with pytest.raises(ValidationError) as exc:
            po.full_clean()
        assert "No se puede reactivar una orden que ha sido cancelada" in str(exc.value)

    def test_delete_protection_for_closed_orders(self, purchase_order_factory):
        """VULNERABILIDAD: No se puede borrar el rastro de una compra ya ejecutada"""
        po = purchase_order_factory(status=PurchaseOrder.Status.CLOSED)
        with pytest.raises(ValidationError) as exc:
            po.delete()
        assert "No se puede eliminar una orden que ya está cerrada" in str(exc.value)

    def test_unique_order_number(self, purchase_order_factory, supplier_factory):
        """EDGE CASE: El número de orden debe ser único en DB"""
        po1 = purchase_order_factory()

        real_supplier = supplier_factory()
        # Forzamos mismo número manualmente para testear restricción DB
        po2 = purchase_order_factory.build(
            order_number=po1.order_number, supplier=real_supplier
        )

        with pytest.raises(IntegrityError):
            po2.save()
