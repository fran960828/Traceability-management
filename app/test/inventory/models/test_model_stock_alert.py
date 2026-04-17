import pytest


@pytest.mark.django_db
class TestMaterialStockAlerts:

    def test_current_stock_calculation(
        self,
        label_material,
        batch_factory,
        stock_movement_factory,
        location_factory,
        user_factory,
    ):
        """
        Prueba que current_stock suma correctamente movimientos de diferentes
        lotes y ubicaciones para un mismo material.
        """
        material = label_material  # Hereda de BaseInventoryModel
        user = user_factory()

        # 1. Creamos dos lotes distintos del mismo material
        # (batch -> order_item -> label)
        batch_1 = batch_factory(order_item__label=material)
        batch_2 = batch_factory(order_item__label=material)
        loc = location_factory()

        # 2. Generamos movimientos: +100, +50, -20
        stock_movement_factory(
            batch=batch_1, quantity=100, movement_type="IN", location=loc, user=user
        )
        stock_movement_factory(
            batch=batch_2, quantity=50, movement_type="IN", location=loc, user=user
        )
        stock_movement_factory(
            batch=batch_1, quantity=-20, movement_type="OUT", location=loc, user=user
        )

        # 3. Verificamos: 100 + 50 - 20 = 130
        assert material.current_stock == 130

    def test_is_low_stock_logic(
        self, enological_factory, batch_factory, stock_movement_factory, user_factory
    ):
        """
        Prueba la lógica del semáforo:
        - Si min_stock es 0, nunca es bajo.
        - Si stock < min_stock, es bajo (True).
        - Si stock >= min_stock, no es bajo (False).
        """
        user = user_factory()
        # Caso 1: min_stock = 0 (Desactivado)
        material_off = enological_factory(min_stock_level=0)
        assert material_off.is_low_stock is False

        # Caso 2: min_stock = 100, stock = 50 (Alerta activa)
        material_alert = enological_factory(min_stock_level=100)
        batch = batch_factory(order_item__enological=material_alert)
        stock_movement_factory(batch=batch, quantity=50, movement_type="IN", user=user)

        assert material_alert.current_stock == 50
        assert material_alert.is_low_stock is True

        # Caso 3: min_stock = 100, stock = 100 (Alerta desactivada - Límite)
        stock_movement_factory(batch=batch, quantity=50, movement_type="IN", user=user)
        assert material_alert.current_stock == 100
        assert material_alert.is_low_stock is False

    def test_stock_independence_between_materials(
        self,
        label_factory,
        packaging_factory,
        batch_factory,
        stock_movement_factory,
        user_factory,
    ):
        """
        Asegura que los movimientos de un material no afectan al stock de otro.
        """
        label = label_factory()
        bottle = packaging_factory()
        user = user_factory()

        # Entrada de 500 botellas
        batch_bottle = batch_factory(order_item__packaging=bottle)
        stock_movement_factory(batch=batch_bottle, quantity=500, user=user)

        # La etiqueta no tiene movimientos, debe ser 0
        assert label.current_stock == 0
        assert bottle.current_stock == 500

    def test_stock_with_no_movements(self, packaging_material):
        """Si un material acaba de ser creado sin movimientos, el stock es 0."""
        assert packaging_material.current_stock == 0
