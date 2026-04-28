from decimal import Decimal
from test.stock.factories import BatchFactory

import pytest
from django.core.exceptions import ValidationError

from stock.models import Batch, StockMovement


@pytest.mark.django_db
class TestProductionOrder:

    def test_happy_path_draft_creation(self, production_order_factory):
        """Verifica la creación básica en borrador."""
        order = production_order_factory(status="DRAFT", lot_number="L-5574")
        assert order.status == "DRAFT"
        assert order.lot_number == "L-5574"
        assert order.quantity_produced == 1000

    def test_confirm_production_updates_stock_fifo(
        self, escenario_produccion_con_stock
    ):
        """
        PRUEBA REINA: Verifica que al confirmar:
        1. El estado cambia a CONFIRMED.
        2. Se crean movimientos 'OUT' para los materiales de la receta.
        """
        order = escenario_produccion_con_stock
        original_qty = order.quantity_produced  # 500 uds

        # Ejecutamos la confirmación (dispara FIFOService)
        order.confirm_production()

        # 1. Verificar cambio de estado
        assert order.status == "CONFIRMED"

        # 2. Verificar que se descontaron botellas (Packaging)
        # Buscamos movimientos OUT vinculados al lote de la botella del vino
        bottle_movements = StockMovement.objects.filter(
            batch__order_item__packaging=order.wine.default_container,
            movement_type="OUT",
        )
        assert bottle_movements.exists()
        # La suma de salidas debe ser igual a la cantidad producida
        total_discounted = abs(sum(m.quantity for m in bottle_movements))
        assert total_discounted == original_qty

    def test_confirm_production_with_enological_items(
        self,
        escenario_produccion_con_stock,
        production_enological_item_factory,
        enological_material_factory,
        stock_movement_factory,
        user_factory,
        location_factory,
    ):
        """Verifica que también se descuenta el stock de productos enológicos manuales."""
        order = escenario_produccion_con_stock
        user = order.user
        loc = location_factory()

        # 1. Preparamos un enológico manual con stock previo
        eno_mat = enological_material_factory(name="Metabisulfito")
        # Creamos lote y stock inicial (10 kg)

        lote_eno = BatchFactory(
            order_item__enological=eno_mat,
            order_item__packaging=None,
            order_item__label=None,
        )
        stock_movement_factory(
            batch=lote_eno, quantity=10, location=loc, user=user, movement_type="IN"
        )

        # 2. Lo añadimos a la orden (Usar 0.5 kg)
        production_enological_item_factory(
            production_order=order, material=eno_mat, quantity_used=0.5
        )

        # 3. Confirmamos la producción
        order.confirm_production()

        # 4. Verificamos que el stock del enológico bajó
        assert lote_eno.current_stock == 9.5

    def test_cannot_confirm_twice(self, escenario_produccion_con_stock):
        """Edge Case: Una orden confirmada no puede volver a confirmarse."""
        order = escenario_produccion_con_stock
        order.confirm_production()  # Primera vez OK

        with pytest.raises(ValidationError, match="ya está confirmada"):
            order.confirm_production()

    def test_atomic_rollback_on_failure(self, escenario_produccion_con_stock):
        """
        Edge Case (Atomicidad): Si un material no tiene stock,
        NO se debe descontar nada de los demás.
        """
        order = escenario_produccion_con_stock
        # Forzamos que la Tirilla DOP no tenga stock (borramos sus lotes)
        Batch.objects.filter(order_item__label=order.wine.default_dop_seal).delete()

        # Al intentar confirmar, fallará por la Tirilla
        with pytest.raises(ValidationError):
            order.confirm_production()

        # Verificamos que NO se han creado movimientos de salida para las botellas
        # (Aunque las botellas sí tenían stock, la transacción debe revertirse)
        assert not StockMovement.objects.filter(movement_type="OUT").exists()

    def test_production_loss_calculations(self, production_order_factory):
        """Verifica que las properties de cálculo de mermas funcionan."""
        # Escenario: 1000 botellas de 0.75L = 750L teóricos.
        # Extraemos 800L del depósito. Merma = 50L (6.25%)
        order = production_order_factory(
            quantity_produced=Decimal("1000"), bulk_liters_withdrawn=Decimal("800")
        )
        # Forzamos capacidad para asegurar el cálculo del test
        order.wine.default_container.capacity = Decimal("0.750")
        # --- AQUÍ USAMOS LOS ASSERTS ---
        # 1. Verificar total litros embotellados
        assert order.total_liters == 750.0

        # 2. Verificar litros de merma (800 - 750)
        assert order.loss_liters == 50.0

        # 3. Verificar porcentaje de merma (50 / 800 * 100)
        assert order.loss_percentage == 6.25

    def test_cannot_modify_quantity_on_confirmed_order(
        self, escenario_produccion_con_stock
    ):
        """Verifica la inmutabilidad con asserts de estado."""
        order = escenario_produccion_con_stock
        order.confirm_production()

        # Assert de control: asegurar que el estado es el correcto antes de intentar el error
        assert order.status == "CONFIRMED"

        order.quantity_produced = 9999

        with pytest.raises(ValidationError, match="No se puede modificar la cantidad"):
            order.full_clean()

        # Assert de persistencia: verificar que en la DB el valor sigue siendo el original
        # Refrescamos desde la base de datos
        order.refresh_from_db()
        assert order.quantity_produced != 9999
        assert order.quantity_produced == 500
