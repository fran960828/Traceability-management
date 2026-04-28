from decimal import Decimal
from test.pricing.factories import (IndirectCostConfigFactory,
                                    ProductionCostingFactory)
from test.stock.factories import BatchFactory

import pytest
from django.utils import timezone


@pytest.fixture
def indirect_config(db):
    """Crea una configuración activa de costos indirectos."""
    return IndirectCostConfigFactory(
        labor_rate=0.1000,  # 0.10€ por unidad
        energy_rate=0.0500,  # 0.05€ por unidad
        amortization_rate=0.0200,  # 0.02€ por unidad
    )


@pytest.fixture
def costing_factory(db, production_order_factory):
    """Wrapper para crear ProductionCosting de forma flexible."""

    def create_costing(**kwargs):
        if "production_order" not in kwargs:
            kwargs["production_order"] = production_order_factory()
        return ProductionCostingFactory(**kwargs)

    return create_costing


# --- ESCENARIOS DE COSTES ---


@pytest.fixture
def escenario_escandallo_completo(
    db,
    production_order_factory,
    stock_movement_factory,
    location_factory,
    user_factory,
    indirect_config,
):
    """
    Escenario Maestro para Escandallos:
    1. Crea un usuario y una ubicación.
    2. Crea una orden de producción en DRAFT.
    3. Para cada material de la receta:
       - Crea un Batch con un PRECIO DE COMPRA específico.
       - Crea un movimiento de ENTRADA (IN) para tener stock.
       - Crea un movimiento de SALIDA (OUT) vinculado a la orden (el consumo).
    """
    user = user_factory(role="BODEGUERO")
    loc = location_factory(name="ALMACEN_GENERAL")
    order = production_order_factory(quantity_produced=1000, user=user, status="DRAFT")

    # Definimos precios de compra realistas para el test
    precios_test = {
        "packagingmaterialmodel": Decimal("0.5000"),  # Botella, Corcho, etc.
        "labelmaterialmodel": Decimal("0.1000"),  # Etiquetas
        "enologicalmaterialmodel": Decimal("1.2000"),  # Aditivos
    }

    recipe = order.wine
    materiales = [
        recipe.default_container,
        recipe.default_cork,
        recipe.default_front_label,
        recipe.default_back_label,    
        recipe.default_dop_seal,
        recipe.default_capsule,
    ]

    for mat in materiales:
        if not mat:
            continue

        model_name = mat._meta.model_name
        price = precios_test.get(model_name, Decimal("0.2000"))

        # 1. Creamos el Lote (Batch) con su OrderItem y su precio
        batch_kwargs = {
            "arrival_date": timezone.now(),
            "order_item__unit_price": price,
            "order_item__packaging": (
                mat if model_name == "packagingmaterialmodel" else None
            ),
            "order_item__label": mat if model_name == "labelmaterialmodel" else None,
        }
        lote = BatchFactory(**batch_kwargs)

        # 2. Entrada de stock (Compra)
        stock_movement_factory(
            batch=lote, quantity=2000, location=loc, user=user, movement_type="IN"
        )

        # 3. Salida de stock (Consumo Real de Producción)
         #Importante: Las notas deben incluir el lot_number para que el servicio lo encuentre
        stock_movement_factory(
            batch=lote,
            quantity=-1000,  # Consumimos las 1000 botellas/etiquetas
            location=loc,
            user=user,
            movement_type="OUT",
            notes=f"Consumo para orden {order.lot_number}",
        )

    return order
