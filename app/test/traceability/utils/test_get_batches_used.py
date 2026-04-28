import pytest
from test.traceability.conftest import orden_trazada_y_confirmada
from traceability.utils.get_material_batch import get_actual_batches_used


@pytest.mark.django_db
class TestTraceabilityInvestigation:

    def test_get_actual_batches_used_after_confirmation(self, orden_trazada_y_confirmada):
        """
        HAPPY PATH: Verifica que tras confirmar una orden, la función recupera
        los lotes reales consumidos por el FIFOService.
        """
        # 1. El escenario nos da una orden en DRAFT con stock disponible
        order = orden_trazada_y_confirmada
        material_botella = order.wine.default_container
        
        # 2. Ejecutamos la acción real del sistema: CONFIRMAR
        # Esto disparará el FIFOService y creará los StockMovements con las notas adecuadas
        #order.confirm_order() 

        # 3. Validamos que la función de trazabilidad extraiga el lote correcto
        # Buscamos el lote consumido para la botella
        result = get_actual_batches_used(order, material_botella)

        # 4. Aserciones
        assert result != "N/A"
        assert result != "Error al recuperar lotes"
        # Verificamos que el resultado tenga formato de lote (ej: LOT-2026-0001)
        assert "LOT-2026" in result

    def test_get_actual_batches_used_multiple_materials(self, orden_trazada_y_confirmada):
        """
        Verifica que la función distingue correctamente entre lotes de diferentes
        materiales (botella vs corcho) en la misma orden.
        """
        order = orden_trazada_y_confirmada
        material_botella = order.wine.default_container
        material_corcho = order.wine.default_cork
        
        lote_botella = get_actual_batches_used(order, material_botella)
        lote_corcho = get_actual_batches_used(order, material_corcho)
        
        assert lote_botella != "N/A"
        assert lote_corcho != "N/A"
        # Cada material debería tener su propio rastro de lote
        assert lote_botella != lote_corcho

    def test_get_actual_batches_used_no_stock_no_confirmation(self, production_order_factory):
        """
        EDGE CASE: Si la orden no se ha confirmado (o no hubo movimientos),
        la función debe devolver N/A con elegancia.
        """
        # Creamos una orden limpia sin confirmar
        order = production_order_factory()
        material = order.wine.default_container
        result = get_actual_batches_used(order, material)
        
        assert result == "N/A"