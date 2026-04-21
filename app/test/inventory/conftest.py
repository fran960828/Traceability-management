from test.inventory.factories import (EnologicalMaterialFactory,
                                      LabelMaterialFactory,
                                      PackagingMaterialFactory)

import pytest


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
