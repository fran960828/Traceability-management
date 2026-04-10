import pytest
from test.stock.factories import LocationFactory, BatchFactory, StockMovementFactory

from test.purchase.conftest import (
    purchase_order_factory,
    purchase_order_item_factory,
    supplier_factory,
    po_completa
)

# Reutilizamos las fixtures de materiales para consistencia
from test.inventory.conftest import (
    enological_factory, enological_material,
    label_factory, label_material,
    packaging_factory, packaging_material
)

__all__ = [
    "enological_factory",
    "enological_material",
    "label_factory",
    "label_material",
    "packaging_factory",
    "packaging_material",
    "purchase_order_factory",
    "purchase_order_item_factory",
    "supplier_factory",
    "po_completa",
]


@pytest.fixture
def location_factory(db):
    return LocationFactory

@pytest.fixture
def batch_factory(db):
    return BatchFactory

@pytest.fixture
def stock_movement_factory(db):
    return StockMovementFactory

# --- ESCENARIOS MAESTROS ---

@pytest.fixture
def batch_con_po(db, batch_factory, purchase_order_item_factory):
    """Crea un lote vinculado a una línea de pedido real."""
    item = purchase_order_item_factory(quantity_ordered=1000)
    return batch_factory(order_item=item)

@pytest.fixture
def escenario_recepcion_parcial(db, batch_con_po, location_factory, user_factory, stock_movement_factory):
    """
    Escenario: Una orden de 1000 unidades donde se reciben 400.
    Útil para testear el cambio de estado a 'PARTIAL'.
    """
    user = user_factory(role="BODEGUERO")
    loc = location_factory(name="ALMACEN_PRINCIPAL")
    
    # Creamos el movimiento de entrada
    mov = stock_movement_factory(
        batch=batch_con_po,
        location=loc,
        quantity=400,
        movement_type='IN',
        user=user
    )
    return mov