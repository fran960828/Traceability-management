import factory
from django.contrib.auth import get_user_model
from stock.models import Location, Batch, StockMovement
from test.purchase.factories import PurchaseOrderItemFactory

User = get_user_model()

class LocationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Location

    # Usamos Sequence para evitar errores de unicidad en el nombre
    name = factory.Sequence(lambda n: f"ALMACEN_{n}")
    description = factory.Faker("sentence")
    is_active = True


class BatchFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Batch

    batch_number = factory.Sequence(lambda n: f"LOT-{2026}-{n:04d}")
    order_item = factory.SubFactory(PurchaseOrderItemFactory)
    expiry_date = factory.Faker("future_date")


class StockMovementFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = StockMovement

    batch = factory.SubFactory(BatchFactory)
    location = factory.SubFactory(LocationFactory)
    quantity = 100
    movement_type = StockMovement.MovementType.IN
    
    # Vinculamos la PO automáticamente a través del batch
    reference_po = factory.LazyAttribute(lambda obj: obj.batch.order_item.purchase_order)
    
    user = None
    notes = factory.Faker("sentence")