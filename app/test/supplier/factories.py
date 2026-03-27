import factory

from supplier.models import Category, Supplier


class CategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Category
        # Crucial para evitar el IntegrityError que vimos ayer
        django_get_or_create = ("name",)

    # Forzamos mayúsculas para coincidir con la sanitización del modelo
    name = factory.Sequence(lambda n: f"CATEGORIA {n}")


class SupplierFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Supplier

    name = factory.Sequence(lambda n: f"Proveedor S.A. {n}")

    # Generamos un NIF válido para el Regex: Letra + 7 números + Letra
    tax_id = factory.Sequence(lambda n: f"A{n:07d}Z")

    # Relación con categoría
    category = factory.SubFactory(CategoryFactory)

    email_pedidos = factory.LazyAttribute(
        lambda o: f"pedidos@{o.name.lower().replace(' ', '')}.com"
    )

    # Teléfono con formato internacional para el validador
    phone = factory.Sequence(lambda n: f"+34600000{n:03d}")

    lead_time = 7
    is_active = True
