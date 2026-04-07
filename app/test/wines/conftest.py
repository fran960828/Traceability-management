from test.inventory.conftest import (label_factory, label_material,
                                     packaging_factory, packaging_material)
from test.inventory.factories import (LabelMaterialFactory,
                                      PackagingMaterialFactory)
from test.wines.factories import WineFactory

import pytest

# --- FIXTURES DE FACTORIES ---
__all__ = ["label_factory", "label_material", "packaging_factory", "packaging_material"]


@pytest.fixture
def wine_factory(db):
    return WineFactory


# --- ESCENARIOS MAESTROS ---


@pytest.fixture
def wine_glass_dop(db, wine_factory):
    """
    Escenario 1: Botella de Vidrio Estándar (DOP).
    Requiere: Envase(VIDRIO), Cierre(CIERRE), Frontal, Contra y Tirilla.
    """
    return wine_factory(
        appellation_type="DOP",
        appellation_name="RIOJA",
        wine_type="TINTO",
        aging_category="CRIANZA",
    )


@pytest.fixture
def wine_bib_mesa(db, wine_factory):
    """
    Escenario 2: Bag-in-Box (Vino de Mesa).
    Requiere: Envase(BIB).
    Opcionales: No lleva Cierre, ni Tirilla, ni etiquetas (suele ir impreso).
    """
    bib_container = PackagingMaterialFactory(packaging_type="BIB", name="BIB 3L")
    return wine_factory(
        name="COSECHERO CAJA",
        appellation_type="MESA",
        appellation_name="VINO DE ESPAÑA",
        default_container=bib_container,
        default_cork=None,
        default_dop_seal=None,
        default_front_label=None,
        default_back_label=None,
    )


@pytest.fixture
def wine_garrafa_plastico(db, wine_factory):
    """
    Escenario 3: Garrafa de Plástico (Vino de la Tierra / IGP).
    Requiere: Envase(PLASTICO), Cierre(CIERRE), Etiqueta Frontal.
    Opcionales: No suele llevar Contra ni Tirilla.
    """
    garrafa_container = PackagingMaterialFactory(
        packaging_type="PLASTICO", name="GARRAFA 5L"
    )
    tapon_rosca = PackagingMaterialFactory(
        packaging_type="CIERRE", name="TAPÓN ROSCA PLÁSTICO"
    )
    etiqueta_f = LabelMaterialFactory(label_type="FRONTAL", name="ETIQUETA GARRAFA")

    return wine_factory(
        name="GARRAFA TRADICIÓN",
        appellation_type="IGP",
        appellation_name="CASTILLA",
        vintage=2026,
        default_container=garrafa_container,
        default_cork=tapon_rosca,
        default_front_label=etiqueta_f,
        default_back_label=None,
        default_dop_seal=None,
    )
