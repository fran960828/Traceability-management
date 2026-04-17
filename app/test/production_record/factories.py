from test.inventory.factories import EnologicalMaterialFactory
from test.wines.factories import WineFactory

import factory
from django.contrib.auth import get_user_model
from django.utils import timezone

from production_record.models import ProductionEnologicalItem, ProductionOrder

User = get_user_model()


class ProductionOrderFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ProductionOrder

    # --- RELACIONES ---
    wine = factory.SubFactory(WineFactory)
    # Asumimos que tienes una UserFactory, si no, usamos la de Django
    user = None

    # --- DATOS DE PRODUCCIÓN ---
    production_date = factory.LazyFunction(timezone.now)
    quantity_produced = 1000
    bulk_liters_withdrawn = 10000

    # Lote único incremental: L26-001, L26-002...
    lot_number = factory.Sequence(lambda n: f"L26-{n:03d}")

    status = ProductionOrder.Status.DRAFT
    notes = factory.Faker("sentence")


class ProductionEnologicalItemFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ProductionEnologicalItem

    production_order = factory.SubFactory(ProductionOrderFactory)
    material = factory.SubFactory(EnologicalMaterialFactory)
    quantity_used = factory.Faker(
        "pydecimal", left_digits=2, right_digits=3, positive=True, min_value=0.1
    )
