from test.production_record.factories import ProductionOrderFactory

import factory

from traceability.models import LotTraceability


class LotTraceabilityFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = LotTraceability

    # Relación OneToOne con la orden de producción
    production_order = factory.SubFactory(ProductionOrderFactory)

    # El snapshot y el hash se dejan vacíos por defecto en la Factory
    # para permitir que la Signal haga su trabajo en los tests de integración.
    history_snapshot = factory.LazyFunction(dict)
    integrity_hash = factory.Faker("sha256")

    class Params:
        # Este trait permite crear una orden ya confirmada fácilmente
        confirmed = factory.Trait(
            production_order=factory.SubFactory(
                ProductionOrderFactory, status="CONFIRMED"
            )
        )
