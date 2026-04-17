from decimal import Decimal
from test.analytics.factories import WineAnalysisFactory

import pytest


@pytest.fixture
def analysis_factory(db):
    return WineAnalysisFactory


# --- ESCENARIOS ANALÍTICOS REFACTORIZADOS ---


@pytest.fixture
def analysis_dop_premium(
    db, analysis_factory, production_order_factory, wine_glass_dop
):
    """
    Escenario: Análisis vinculado a una orden de producción de vino DOP.
    """
    # 1. Creamos la orden para ese vino específico usando tu wrapper de producción
    order = production_order_factory(wine=wine_glass_dop)

    # 2. Vinculamos el análisis a la orden
    return analysis_factory(
        production_order=order,
        alcohol_content=Decimal(14.50),
        ph=Decimal(3.58),
        volatile_acidity=Decimal(0.55),
        total_acidity=Decimal(5.40),
        IC=Decimal(18.2),
        folin_index=Decimal(75.0),
        malic_acid=Decimal(0.02),
        lactic_acid=Decimal(1.80),
    )


@pytest.fixture
def analysis_bib_mesa(db, analysis_factory, production_order_factory, wine_bib_mesa):
    """
    Escenario: Análisis vinculado a una orden de producción de vino BIB Mesa.
    """
    order = production_order_factory(wine=wine_bib_mesa)

    return analysis_factory(
        production_order=order,
        alcohol_content=Decimal(12.00),
        ph=Decimal(3.35),
        volatile_acidity=Decimal(0.32),
        total_acidity=Decimal(6.10),
        IC=Decimal(8.50),
        folin_index=Decimal(45.00),
        malic_acid=Decimal(1.20),
        lactic_acid=Decimal(0.10),
    )
