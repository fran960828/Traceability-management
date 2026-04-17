from datetime import date
from decimal import Decimal
from test.production_record.factories import ProductionOrderFactory

import factory

from analytics.models import WineAnalysis


class WineAnalysisFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = WineAnalysis

    # --- RELACIONES ---
    # Ahora la fuente de la verdad es la orden
    production_order = factory.SubFactory(ProductionOrderFactory)

    # --- METADATOS ---
    analysis_date = factory.LazyFunction(date.today)
    laboratory = "LABORATORIO INTERNO ONTALBA"  # Ya lo pongo en mayúsculas para evitar el trigger del clean
    observations = factory.Faker("sentence", nb_words=10)

    # --- PARÁMETROS ANALÍTICOS ---
    alcohol_content = Decimal("14.00")
    volatile_acidity = Decimal("0.45")
    total_acidity = Decimal("5.20")
    ph = Decimal("3.65")
    reducing_sugars = Decimal("1.80")
    malic_acid = Decimal("0.05")
    lactic_acid = Decimal("1.50")
    IC = Decimal("12.50")
    folin_index = Decimal("65.00")
    gluconic_acid = Decimal("0.20")
