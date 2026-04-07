from test.inventory.factories import PackagingMaterialFactory
# Asumiendo que tienes una factory para proveedores
from test.supplier.factories import SupplierFactory

import factory

from purchase.models import PurchaseOrder, PurchaseOrderItem


class PurchaseOrderFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = PurchaseOrder

    supplier = factory.SubFactory(SupplierFactory)
    status = PurchaseOrder.Status.DRAFT
    date_delivery_expected = factory.Faker("future_date")
    notes = factory.Faker("sentence")
    # El order_number se genera en el save() del modelo, así que no lo forzamos aquí


class PurchaseOrderItemFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = PurchaseOrderItem

    purchase_order = factory.SubFactory(PurchaseOrderFactory)
    quantity_ordered = 1000
    quantity_received = 0
    unit_price = factory.Faker(
        "pydecimal", left_digits=2, right_digits=4, positive=True, min_value=0.1
    )

    # Por defecto creamos un item de packaging si no se especifica
    packaging = factory.SubFactory(PackagingMaterialFactory)
    label = None
    enological = None
