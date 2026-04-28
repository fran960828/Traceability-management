from decimal import Decimal

import pytest

from pricing.models import IndirectCostConfig
from pricing.utils.services import CostingService
from stock.models import StockMovement


@pytest.mark.django_db
class TestProductionCostingService:

    # --- 1. HAPPY PATH (Camino de éxito) ---

    def test_generate_escandallo_happy_path(self, escenario_escandallo_completo):
        """
        Verifica el cálculo dinámico basado en las tasas de la factory.
        """
        order = escenario_escandallo_completo
        

        # 1. Ejecución del servicio
        escandallo = CostingService.generate_escandallo(order)

        # 2. Obtención de la configuración activa para el cálculo manual
        # Esto garantiza que el test sea robusto ante cambios en las factories
        config = IndirectCostConfig.objects.get(is_active=True)

        tasa_total = config.labor_rate + config.energy_rate + config.amortization_rate
        cantidad = Decimal(str(order.quantity_produced))

        expected_indirect_total = cantidad * tasa_total
        # 3. Aserciones Dinámicas
        assert escandallo.total_indirect_cost == expected_indirect_total

        # Verificación de materiales (basado en los precios de tu escenario: 1600.00)
        assert escandallo.total_material_cost == Decimal("1800.0000")

        # Verificación del coste unitario
        expected_grand_total = Decimal("1800.0000") + expected_indirect_total
        assert escandallo.grand_total == expected_grand_total
        assert escandallo.unit_cost == (expected_grand_total / cantidad)

    # --- 2. EDGE CASES (Casos Límite) ---

    def test_generate_escandallo_with_zero_quantity(
        self, indirect_config, production_order_factory
    ):
        """
        Verifica que una orden de 0 unidades no cause un ZeroDivisionError.
        """
        # Creamos una orden vacía
        order = production_order_factory(quantity_produced=0)

        escandallo = CostingService.generate_escandallo(order)

        assert escandallo.unit_cost == Decimal("0.0000")
        assert escandallo.grand_total == Decimal("0.0000")
        assert escandallo.total_indirect_cost == Decimal("0.0000")

    def test_generate_escandallo_no_materials_consumed(
        self, indirect_config, production_order_factory
    ):
        """
        Verifica el comportamiento cuando hay orden pero no hubo consumos de stock registrados.
        """
        order = production_order_factory(quantity_produced=1000)

        config = IndirectCostConfig.objects.get(is_active=True)

        tasa_total = config.labor_rate + config.energy_rate + config.amortization_rate
        cantidad = Decimal(str(order.quantity_produced))

        expected_indirect_total = cantidad * tasa_total
        escandallo = CostingService.generate_escandallo(order)

        # No debe haber materiales en el snapshot
        assert escandallo.materials_snapshot == {}
        assert escandallo.total_material_cost == Decimal("0.0000")
        # Pero los indirectos sí deben aplicarse por la cantidad producida
        assert escandallo.total_indirect_cost == expected_indirect_total

    def test_grouping_multiple_lots_of_same_material(
        self, escenario_escandallo_completo, stock_movement_factory
    ):
        """
        Verifica que si se usan dos lotes del mismo material, el snapshot los agrupa.
        """
        order = escenario_escandallo_completo

        # 1. Obtenemos el material de referencia (el contenedor por defecto del vino)
        material_obj = order.wine.default_container
        material_name = material_obj.name

        # 2. Buscamos el lote que ya se usó en la fixture para este material

        # Filtramos por el lot_number de la orden y que el item de compra coincida con nuestro material
        existing_mov = StockMovement.objects.filter(
            notes__icontains=order.lot_number, batch__order_item__packaging=material_obj
        ).first()

        if not existing_mov:
            pytest.skip(
                "No se encontró el movimiento inicial del material en la fixture."
            )

        existing_batch = existing_mov.batch

        # 3. Añadimos un consumo extra de 500 unidades del MISMO lote
        stock_movement_factory(
            batch=existing_batch,
            quantity=-500,  # Importante: negativo para salidas (OUT)
            movement_type="OUT",
            notes=f"Consumo extra para orden {order.lot_number}",
            user=order.user,  # Pasamos el usuario para evitar IntegrityError
        )

        # 4. Ejecutamos el servicio
        escandallo = CostingService.generate_escandallo(order)

        # 5. Verificación
        # La cantidad inicial en la fixture era 1000, ahora sumamos 500 más = 1500
        snapshot_item = escandallo.materials_snapshot.get(material_name)

        assert (
            snapshot_item is not None
        ), f"El material {material_name} no aparece en el snapshot"
        assert snapshot_item["quantity"] == 1500.0

        # Verificamos que el coste total también haya escalado (precio 0.50 * 1500)
        assert snapshot_item["total_cost"] == 750.0

    # --- 3. VALIDACIONES Y FALLOS (Error Handling) ---

    def test_fails_if_no_indirect_config_active(self, escenario_escandallo_completo):
        """
        Debe lanzar ValueError si no hay una configuración de tasas activa.
        """
        # Desactivamos cualquier configuración
        IndirectCostConfig.objects.all().update(is_active=False)

        with pytest.raises(
            ValueError, match="No hay una configuración de costos indirectos activa"
        ):
            CostingService.generate_escandallo(escenario_escandallo_completo)
