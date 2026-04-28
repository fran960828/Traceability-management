from decimal import Decimal
from test.production_record.factories import ProductionOrderFactory

import factory

from pricing.models import IndirectCostConfig, ProductionCosting


class IndirectCostConfigFactory(factory.django.DjangoModelFactory):
    """Factory para definir las tasas de luz, mano de obra, etc."""

    class Meta:
        model = IndirectCostConfig

    name = factory.Faker("sentence", nb_words=3)
    labor_rate = Decimal("0.05")

    energy_rate = Decimal("0.08")

    amortization_rate = Decimal("0.02")

    is_active = True


class ProductionCostingFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ProductionCosting

    production_order = factory.SubFactory(ProductionOrderFactory)

    # Snapshot detallado con el "vestido" completo de la botella
    materials_snapshot = factory.LazyFunction(
        lambda: {
            "BOTELLA BORDELESA": {
                "material_id": 1,
                "unit_price": 0.55,
                "quantity": 1000,
                "total_cost": 550.00,
                "unit": "unidades",
            },
            "CORCHO TECNICO": {
                "material_id": 2,
                "unit_price": 0.18,
                "quantity": 1000,
                "total_cost": 180.00,
                "unit": "unidades",
            },
            "CAPSULA COMPLETA": {
                "material_id": 3,
                "unit_price": 0.08,
                "quantity": 1000,
                "total_cost": 80.00,
                "unit": "unidades",
            },
            "ETIQUETA FRONTAL DOMINIO": {
                "material_id": 4,
                "unit_price": 0.12,
                "quantity": 1000,
                "total_cost": 120.00,
                "unit": "unidades",
            },
            "CONTRAETIQUETA": {
                "material_id": 5,
                "unit_price": 0.05,
                "quantity": 1000,
                "total_cost": 50.00,
                "unit": "unidades",
            },
            "TIRILLA DOP": {
                "material_id": 6,
                "unit_price": 0.03,
                "quantity": 1000,
                "total_cost": 30.00,
                "unit": "unidades",
            },
        }
    )

    labor_total = Decimal("80.0000")
    energy_total = Decimal("30.0000")
    amortization_total = Decimal("40.0000")

    # Cálculos automáticos para mantener coherencia en el test
    total_material_cost = factory.LazyAttribute(
        lambda o: Decimal(
            sum(item["total_cost"] for item in o.materials_snapshot.values())
        )
    )
    total_indirect_cost = factory.LazyAttribute(
        lambda o: o.labor_total + o.energy_total + o.amortization_total
    )

    grand_total = factory.LazyAttribute(
        lambda o: o.total_material_cost + o.total_indirect_cost
    )
    unit_cost = factory.LazyAttribute(
        lambda o: o.grand_total / Decimal(str(o.production_order.quantity_produced))
    )
