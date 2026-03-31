from test.inventory.factories import LabelMaterialFactory, PackagingMaterialFactory

import factory

from wines.models import WineModel


class WineFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = WineModel

    # --- IDENTIFICACIÓN ---
    name = factory.Sequence(lambda n: f"VINO RESERVA ESPECIAL {n}")
    vintage = 2024
    is_active = True

    # --- CLASIFICACIÓN ---
    appellation_type = "DOP"
    appellation_name = "RÍAS BAIXAS"
    wine_type = "TINTO"
    aging_category = "CRIANZA"
    varietals = "100% TEMPRANILLO"
    alcohol_percentage = 14.0

    # --- ESCANDALLO (Relaciones Inteligentes) ---

    # Envase: Por defecto una botella de vidrio
    default_container = factory.SubFactory(
        PackagingMaterialFactory,
        packaging_type="VIDRIO",
        name=factory.Sequence(lambda n: f"BOTELLA BORDELESA {n}"),
    )

    # Cierre: Por defecto un corcho
    default_cork = factory.SubFactory(
        PackagingMaterialFactory,
        packaging_type="CIERRE",
        name=factory.Sequence(lambda n: f"CORCHO NATURAL {n}"),
    )

    # Etiqueta Frontal: Sincronizada con el año del vino
    default_front_label = factory.SubFactory(
        LabelMaterialFactory,
        label_type="FRONTAL",
        vintage=factory.SelfAttribute("..vintage"),  # Copia el vintage del Wine
    )

    # Etiqueta Trasera: Sincronizada con el año del vino
    default_back_label = factory.SubFactory(
        LabelMaterialFactory,
        label_type="CONTRA",
        vintage=factory.SelfAttribute("..vintage"),
    )

    # Tirilla DOP: Solo si es DOP/DOCa (obligatorio por tu clean)
    default_dop_seal = factory.SubFactory(
        LabelMaterialFactory,
        label_type="TIRILLA",
        vintage=factory.SelfAttribute("..vintage"),
        name=factory.Sequence(lambda n: f"TIRILLA DOP {n}"),
    )
