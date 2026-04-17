from test.inventory.factories import EnologicalMaterialFactory, PackagingMaterialFactory
from test.wines.factories import WineFactory

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from production_record.serializers import ProductionOrderSerializer

User = get_user_model()


@pytest.mark.django_db
class TestProductionOrderSerializer:

    def test_create_order_with_enological_items(self, user_factory):
        """Happy Path: Crear orden con materiales enológicos anidados."""
        # Preparamos un vino con receta completa (usando Vidrio)
        vidrio = PackagingMaterialFactory(packaging_type="VIDRIO")
        wine = WineFactory(
            default_container=vidrio,
            default_cork__packaging_type="CIERRE",
            default_front_label__label_type="FRONTAL",
            default_back_label__label_type="CONTRA",
        )
        user = user_factory()
        eno_mat = EnologicalMaterialFactory()

        data = {
            "wine": wine.id,
            "user": user.id,
            "production_date": timezone.now().date(),
            "quantity_produced": 1000,
            "bulk_liters_withdrawn": 760.0,
            "lot_number": "LOTE-2024-001",
            "enological_materials": [{"material": eno_mat.id, "quantity_used": 0.5}],
        }

        serializer = ProductionOrderSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        order = serializer.save()

        assert order.enological_materials.count() == 1
        assert order.enological_materials.first().material == eno_mat

    def test_validation_fails_incomplete_recipe(self, user_factory):
        """Validación (Service): Error si el vino (vidrio) no tiene corcho."""
        vidrio = PackagingMaterialFactory(packaging_type="VIDRIO")
        wine_sin_corcho = WineFactory.build(default_container=vidrio, default_cork=None)
        wine_sin_corcho.save_base(raw=True)
        user = user_factory()

        data = {
            "wine": wine_sin_corcho.id,
            "user": user.id,
            "production_date": timezone.now().date(),
            "quantity_produced": 500,
            "bulk_liters_withdrawn": 380,
            "lot_number": "LOTE-FAIL",
        }

        serializer = ProductionOrderSerializer(data=data)
        assert not serializer.is_valid()
        # El error viene del WineRecipeService a través del validate()
        assert "wine" in serializer.errors
        assert "Falta: Cierre" in str(serializer.errors["wine"])

    def test_update_not_allowed_if_confirmed(self, production_order_factory):
        """Edge Case: Impedir actualización si ya está confirmado."""
        order = production_order_factory(status="CONFIRMED")
        data = {"notes": "Intento de cambio"}

        serializer = ProductionOrderSerializer(instance=order, data=data, partial=True)

        assert not serializer.is_valid()
        assert "No se puede modificar" in str(serializer.errors["non_field_errors"])

    def test_future_date_not_allowed(self, wine_factory, user_factory):
        """Edge Case: La fecha de producción no puede ser mañana."""
        tomorrow = timezone.now().date() + timezone.timedelta(days=1)
        wine = wine_factory()
        user = user_factory()

        data = {
            "wine": wine.id,
            "user": user.id,
            "production_date": tomorrow,
            "quantity_produced": 100,
            "lot_number": "L-FUTURE",
        }

        serializer = ProductionOrderSerializer(data=data)
        assert not serializer.is_valid()
        assert "production_date" in serializer.errors
