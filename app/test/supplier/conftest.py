from test.supplier.factories import CategoryFactory, SupplierFactory

import pytest
from django.contrib.auth import get_user_model

# --- FIXTURES DE FACTORIES ---
User = get_user_model()


@pytest.fixture
def category_factory(db):
    return CategoryFactory


@pytest.fixture
def supplier_factory(db):
    return SupplierFactory


# --- FIXTURES DE OBJETOS INSTANCIADOS ---


@pytest.fixture
def category(db, category_factory):
    return category_factory()


@pytest.fixture
def supplier(db, supplier_factory):
    return supplier_factory()
