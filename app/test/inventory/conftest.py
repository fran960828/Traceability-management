import pytest
from test.inventory.factories import (
    PackagingMaterialFactory, 
    EnologicalMaterialFactory, 
    LabelMaterialFactory
)

from test.supplier.conftest import supplier, supplier_factory, category, category_factory

# --- FIXTURES DE FACTORIES ---
# Estas permiten crear objetos con datos personalizados: packaging_factory(name="BOTELLA ESPECIAL")

@pytest.fixture
def packaging_factory(db):
    return PackagingMaterialFactory

@pytest.fixture
def enological_factory(db):
    return EnologicalMaterialFactory

@pytest.fixture
def label_factory(db):
    return LabelMaterialFactory


# --- FIXTURES DE OBJETOS INSTANCIADOS ---
# Estas devuelven un objeto ya creado con los datos por defecto de la factory

@pytest.fixture
def packaging_material(db, packaging_factory):
    return packaging_factory()

@pytest.fixture
def enological_material(db, enological_factory):
    return enological_factory()

@pytest.fixture
def label_material(db, label_factory):
    return label_factory()