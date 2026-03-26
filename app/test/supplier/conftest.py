import pytest

from supplier.models import Category, Supplier

# ... (tus fixtures de user_factory, api_client y auth_client se mantienen)


@pytest.fixture
def category_factory(db):
    def _make_category(name="General"):
        # get_or_create evita errores si ya existe una categoría con ese nombre
        category, _ = Category.objects.get_or_create(name=name)
        return category

    return _make_category


@pytest.fixture
def supplier_factory(db, category_factory):
    # Usamos una lista para que el contador persista entre llamadas
    count = [0]

    def _make_supplier(name="Prov", tax_id=None, category=None):
        count[0] += 1
        if tax_id is None:
            tax_id = f"B{count[0]:08d}"  # Genera B00000001, B00000002...

        if category is None:
            category = category_factory()

        return Supplier.objects.create(
            name=name,
            tax_id=tax_id,
            category=category,
            email_pedidos=f"test{count[0]}@ontalba.es",
        )

    return _make_supplier
