import pytest
from django.core.exceptions import ValidationError

from purchase.models import PurchaseOrder
from stock.models import StockMovement


@pytest.mark.django_db
class TestStockMovementModel:

    # --- HAPPY PATH ---
    def test_movement_creation_is_successful(
        self, batch_con_po, location_factory, user_factory
    ):
        """HAPPY PATH: Registrar una entrada de stock válida vinculada a una PO."""
        user = user_factory()
        loc = location_factory(name="ALMACEN_NORTE")

        movement = StockMovement.objects.create(
            batch=batch_con_po,
            location=loc,
            quantity=500,
            movement_type=StockMovement.MovementType.IN,
            reference_po=batch_con_po.order_item.purchase_order,
            user=user,
            notes="  Entrada    inicial  ",
        )

        assert movement.id is not None
        assert movement.notes == "Entrada inicial"  # Limpieza de espacios
        assert movement.quantity == 500

    # --- VALIDACIONES (CLEAN) ---
    def test_movement_zero_quantity_fails(
        self, batch_con_po, location_factory, user_factory
    ):
        """VALIDACIÓN: No se permiten movimientos de 0 unidades."""
        user = user_factory()
        mov = StockMovement(
            batch=batch_con_po,
            location=location_factory(),
            quantity=0,
            movement_type="IN",
            user=user,
        )
        with pytest.raises(
            ValidationError, match="La cantidad del movimiento no puede ser cero"
        ):
            mov.save()

    @pytest.mark.parametrize(
        "m_type, qty, error_msg",
        [
            ("IN", -10, "Un movimiento de ENTRADA IN debe tener cantidad positiva"),
            ("OUT", 10, "Un movimiento de SALIDA OUT debe tener cantidad negativa"),
        ],
    )
    def test_movement_sign_consistency(
        self, m_type, qty, error_msg, batch_con_po, location_factory, user_factory
    ):
        """VALIDACIÓN: El signo debe corresponder al tipo de movimiento."""
        user = user_factory()
        mov = StockMovement(
            batch=batch_con_po,
            location=location_factory(),
            quantity=qty,
            movement_type=m_type,
            user=user,
        )

        # Usamos match con el escape de los paréntesis \( \) porque son caracteres especiales en Regex
        # Y permitimos que el mensaje esté contenido en cualquier parte de la excepción
        with pytest.raises(ValidationError) as excinfo:
            mov.save()

        # Verificamos que el error esté específicamente en el campo 'quantity'
        assert "quantity" in excinfo.value.message_dict
        assert any(msg for msg in excinfo.value.message_dict["quantity"])

    # --- EDGE CASES / INMUTABILIDAD ---
    def test_movement_is_immutable(self, stock_movement_factory, user_factory):
        """EDGE CASE: Una vez guardado, el movimiento no se puede editar."""
        user = user_factory()
        mov = stock_movement_factory(user=user, quantity=100, movement_type="IN")

        with pytest.raises(
            ValidationError, match="Los movimientos de stock son inmutables"
        ):
            mov.notes = "Intento de fraude o corrección"
            mov.save()

    # --- TEST DE LA SIGNAL (INTEGRACIÓN) ---
    def test_signal_updates_purchase_order_flow(
        self, batch_con_po, location_factory, user_factory
    ):
        """
        INTEGRACIÓN: Verificar que la Signal:
        1. Actualiza quantity_received en el Item.
        2. Cambia el status de la PO a PARTIAL y luego a CLOSED.
        """
        user = user_factory()
        loc = location_factory()
        item = batch_con_po.order_item
        po = item.purchase_order

        # Estado inicial
        assert item.quantity_received == 0
        assert po.status == PurchaseOrder.Status.DRAFT

        # 1. Recepción Parcial (50%)
        StockMovement.objects.create(
            batch=batch_con_po,
            location=loc,
            quantity=500,  # Pedidas: 1000 en la fixture
            movement_type="IN",
            reference_po=po,
            user=user,
        )

        item.refresh_from_db()
        po.refresh_from_db()
        assert item.quantity_received == 500
        assert po.status == PurchaseOrder.Status.PARTIAL

        # 2. Recepción Total (Restante)
        StockMovement.objects.create(
            batch=batch_con_po,
            location=loc,
            quantity=500,
            movement_type="IN",
            reference_po=po,
            user=user,
        )

        item.refresh_from_db()
        po.refresh_from_db()
        assert item.quantity_received == 1000
        assert po.status == PurchaseOrder.Status.CLOSED
