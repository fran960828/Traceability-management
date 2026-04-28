import pytest
from test.traceability.factories import LotTraceabilityFactory

@pytest.fixture
def traceability_record_factory(db, production_order_factory):
    """
    Wrapper para LotTraceabilityFactory.
    Si no se pasa una orden, usa el wrapper de producción para crear una válida.
    """
    def create_record(**kwargs):
        if "production_order" not in kwargs:
            # Reutilizamos tu lógica de production_record
            kwargs["production_order"] = production_order_factory()
        return LotTraceabilityFactory(**kwargs)
    
    return create_record

# --- ESCENARIOS DE TRAZABILIDAD ---

@pytest.fixture
def orden_trazada_y_confirmada(db, escenario_produccion_con_stock):
    """
    Escenario Maestro: Una orden que ha pasado por todo el proceso.
    1. Tiene stock.
    2. Se confirma (esto dispara los descuentos y la Signal).
    3. Devuelve la orden con su objeto 'traceability_record' ya generado.
    """
    order = escenario_produccion_con_stock
    
    # Al llamar a confirm_production, la Signal de la app de trazabilidad
    # debería activarse y crear el LotTraceability automáticamente.
    order.confirm_production()
    
    # Refrescamos de la DB para asegurar que la relación OneToOne está disponible
    order.refresh_from_db()
    return order