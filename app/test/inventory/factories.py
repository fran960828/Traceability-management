from test.supplier.factories import \
    SupplierFactory  # Reutilizamos tu factoría existente

import factory

from inventory.models.enological_material_model import EnologicalMaterialModel
from inventory.models.label_material_model import LabelMaterialModel
from inventory.models.packaging_material_model import PackagingMaterialModel


class PackagingMaterialFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = PackagingMaterialModel

    # Atributos básicos
    name = factory.Sequence(lambda n: f"BOTELLA BORDELESA {n}")

    # Relación: Cada vez que creas un material, FactoryBoy crea un proveedor automáticamente
    supplier = factory.SubFactory(SupplierFactory)

    # Choices: Ponemos un valor por defecto válido
    packaging_type = "VIDRIO"
    unit_mesure = "UNIDAD"
    min_stock_level = 500
    is_active = True

    # Campos específicos
    specification = "75CL"
    color = "VERDE"


class EnologicalMaterialFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = EnologicalMaterialModel

    name = factory.Sequence(lambda n: f"METABISULFITO {n}")
    supplier = factory.SubFactory(SupplierFactory)

    enological_type = "CONSERVANTE"
    unit_mesure = "KG"  # Coherencia: Los enológicos suelen ir en KG o LITRO
    min_stock_level = 25
    is_active = True

    commercial_format = "SACO 25KG"


class LabelMaterialFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = LabelMaterialModel

    # No ponemos el 'name' aquí si queremos testear la generación automática del serializer
    # Pero para la factoría base, es mejor tener uno por defecto
    name = factory.Sequence(lambda n: f"ETIQUETA RESERVA {n}")
    supplier = factory.SubFactory(SupplierFactory)

    label_type = "FRONTAL"
    brand_reference = factory.Sequence(lambda n: f"MARCA PROPIA {n}")
    vintage = 2026

    unit_mesure = "MILLAR"  # Coherencia: Las etiquetas suelen ir por millares
    min_stock_level = 10
    is_active = True
