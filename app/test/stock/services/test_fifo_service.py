import pytest
from django.core.exceptions import ValidationError

from stock.models import StockMovement
from stock.services import FIFOService


@pytest.mark.django_db
class TestFIFOService:

    def test_consume_material_single_batch(
        self,
        packaging_factory,
        batch_factory,
        stock_movement_factory,
        location_factory,
        user_factory,
    ):
        """Test: Consumo de un solo lote cuando hay stock de sobra."""
        user = user_factory()
        loc = location_factory()
        botella = packaging_factory(name="Bordelesa")

        # Creamos un lote con 1000 unidades
        lote = batch_factory(order_item__packaging=botella)
        stock_movement_factory(batch=lote, quantity=1000, location=loc, user=user)

        # Ejecutamos el servicio para consumir 200
        FIFOService.consume_material(botella, 200, user, "Test consumo simple")

        # Verificamos: El lote debe tener ahora un movimiento de -200
        # (1000 iniciales + -200 = 800)
        assert StockMovement.objects.filter(batch=lote, quantity=-200).exists()
        # El balance total del lote debería ser 800
        assert lote.current_stock == 800

    def test_consume_material_fifo_cascade(
        self,
        packaging_factory,
        batch_factory,
        stock_movement_factory,
        location_factory,
        user_factory,
    ):
        """Test: El sistema agota el lote más viejo y pasa al siguiente (Cascada)."""
        user = user_factory()
        loc = location_factory()
        botella = packaging_factory(name="Bordelesa")

        # Lote A (Viejo): 500 unidades
        lote_a = batch_factory(order_item__packaging=botella)
        stock_movement_factory(batch=lote_a, quantity=500, location=loc, user=user)

        # Lote B (Nuevo): 1000 unidades
        lote_b = batch_factory(order_item__packaging=botella)
        stock_movement_factory(batch=lote_b, quantity=1000, location=loc, user=user)

        # Queremos consumir 800 unidades
        # Debería: Agotar las 500 del A y quitar 300 del B.
        FIFOService.consume_material(botella, 800, user, "Test cascada")

        assert lote_a.current_stock == 0
        assert lote_b.current_stock == 700  # 1000 - 300

        # Verificar que se crearon los movimientos correctos
        assert StockMovement.objects.filter(batch=lote_a, quantity=-500).exists()
        assert StockMovement.objects.filter(batch=lote_b, quantity=-300).exists()

    def test_consume_material_insufficient_stock(
        self,
        packaging_factory,
        batch_factory,
        stock_movement_factory,
        location_factory,
        user_factory,
    ):
        """Test: Si no hay stock suficiente, lanza ValidationError y no crea movimientos."""
        user = user_factory()
        loc = location_factory()
        botella = packaging_factory(name="Bordelesa")

        lote = batch_factory(order_item__packaging=botella)
        stock_movement_factory(batch=lote, quantity=100, location=loc, user=user)

        # Intentamos consumir 500 teniendo solo 100
        with pytest.raises(ValidationError) as excinfo:
            FIFOService.consume_material(botella, 500, user, "Test error")

        assert "Stock insuficiente" in str(excinfo.value)
        # Verificamos que NO se creó ningún movimiento de salida de -500
        assert not StockMovement.objects.filter(quantity=-500).exists()
