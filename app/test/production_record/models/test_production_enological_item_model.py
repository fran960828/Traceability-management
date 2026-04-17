import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError


@pytest.mark.django_db
class TestProductionEnologicalItem:

    def test_happy_path_creation(self, production_enological_item_factory):
        """Prueba que se puede crear un ítem enológico correctamente."""
        item = production_enological_item_factory(quantity_used=0.500)
        assert item.id is not None
        assert item.quantity_used == 0.500

    def test_unique_together_constraint(
        self,
        production_order_factory,
        enological_material_factory,
        production_enological_item_factory,
    ):
        """Edge Case: No se puede añadir el mismo material dos veces a la misma orden."""
        order = production_order_factory()
        mat = enological_material_factory()
        # Primer registro
        production_enological_item_factory(production_order=order, material=mat)

        # Segundo registro del mismo material debe fallar
        with pytest.raises(IntegrityError):
            production_enological_item_factory(production_order=order, material=mat)

    def test_min_quantity_validation(self, production_enological_item_factory):
        """Edge Case: La cantidad usada debe ser positiva."""
        with pytest.raises(ValidationError):
            item = production_enological_item_factory(quantity_used=-1.0)
            item.full_clean()
