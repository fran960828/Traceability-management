from test.inventory.factories import EnologicalMaterialFactory
from test.production_record.factories import (ProductionEnologicalItemFactory,
                                              ProductionOrderFactory)
from test.stock.factories import BatchFactory

import pytest
from django.utils import timezone


@pytest.fixture
def production_order_factory(db, user_factory):
    """
    Wrapper para ProductionOrderFactory que asegura que siempre haya
    un usuario si no se proporciona uno explícitamente.
    """

    def create_order(**kwargs):
        if "user" not in kwargs:
            kwargs["user"] = user_factory()
        return ProductionOrderFactory(**kwargs)

    return create_order


@pytest.fixture
def production_enological_item_factory(db, production_order_factory):
    """
    Wrapper para ProductionEnologicalItemFactory que asegura que la orden
    padre tenga un usuario.
    """

    def create_item(**kwargs):
        if "production_order" not in kwargs:
            # Esto usará nuestro wrapper inteligente de arriba
            kwargs["production_order"] = production_order_factory()
        return ProductionEnologicalItemFactory(**kwargs)

    return create_item


@pytest.fixture
def enological_material_factory(db):
    return EnologicalMaterialFactory


# --- ESCENARIOS MAESTROS ---


@pytest.fixture
def escenario_produccion_con_stock(
    db, production_order_factory, stock_movement_factory, location_factory, user_factory
):
    """
    Escenario: Una orden de producción lista para ser confirmada.
    """
    # Usamos tu fixture de usuario para crear al responsable
    user = user_factory(role="BODEGUERO")
    loc = location_factory(name="ALMACEN_PRODUCCION")

    # 1. Creamos la orden (ahora el factory recibe el usuario de la fixture)
    order = production_order_factory(quantity_produced=500, user=user, status="DRAFT")

    # 2. Generamos stock para cada material de la receta del vino
    recipe = order.wine
    materiales_fijos = [
        recipe.default_container,
        recipe.default_cork,
        recipe.default_capsule,
        recipe.default_front_label,
        recipe.default_back_label,
        recipe.default_dop_seal,
    ]

    for mat in materiales_fijos:
        if mat:
            # Identificamos el tipo de modelo para mapearlo correctamente al OrderItem del Batch
            model_name = mat._meta.model_name
            batch_kwargs = {
                "arrival_date": timezone.now(),
                "order_item__packaging": None,
                "order_item__label": None,
                "order_item__enological": None,
            }

            if model_name == "packagingmaterialmodel":
                batch_kwargs["order_item__packaging"] = mat
            elif model_name == "labelmaterialmodel":
                batch_kwargs["order_item__label"] = mat

            lote = BatchFactory(**batch_kwargs)

            stock_movement_factory(
                batch=lote, quantity=1000, location=loc, user=user, movement_type="IN"
            )

    return order
