from test.inventory.conftest import (enological_factory, enological_material,
                                     label_factory, label_material,
                                     packaging_factory, packaging_material)
from test.purchase.factories import (PurchaseOrderFactory,
                                     PurchaseOrderItemFactory)
from test.supplier.factories import SupplierFactory

import pytest

__all__ = [
    "enological_factory",
    "enological_material",
    "label_factory",
    "label_material",
    "packaging_factory",
    "packaging_material",
]


@pytest.fixture
def supplier_factory(db):
    return SupplierFactory


@pytest.fixture
def purchase_order_factory(db):
    return PurchaseOrderFactory


@pytest.fixture
def purchase_order_item_factory(db):
    return PurchaseOrderItemFactory


# Escenario maestro: Una orden con varios items ya creados
@pytest.fixture
def po_completa(
    db,
    purchase_order_factory,
    purchase_order_item_factory,
    packaging_factory,
    enological_factory,
):
    po = purchase_order_factory(status="OPEN")
    # Añadimos un corcho
    purchase_order_item_factory(
        purchase_order=po,
        packaging=packaging_factory(name="CORCHO PREMIUM"),
        quantity_ordered=5000,
    )
    # Añadimos una manoproteína
    purchase_order_item_factory(
        purchase_order=po,
        packaging=None,
        enological=enological_factory(name="MANOPROTEINA X"),
        quantity_ordered=10,
    )
    return po
