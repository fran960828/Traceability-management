import pytest

from purchase.serializers import PurchaseOrderItemSerializer


@pytest.mark.django_db
class TestPurchaseOrderItemSerializer:

    # --- HAPPY PATH ---
    def test_valid_packaging_item_serializer(self, packaging_factory):
        """ESCENARIO: Validar un ítem de packaging correctamente."""
        pack = packaging_factory()
        data = {"packaging": pack.id, "quantity_ordered": 500, "unit_price": "1.2500"}
        serializer = PurchaseOrderItemSerializer(data=data)
        assert serializer.is_valid()
        assert serializer.validated_data["packaging"] == pack

    # --- EDGE CASES ---
    def test_error_multiple_materials_in_serializer(
        self, packaging_factory, label_factory
    ):
        """EDGE CASE: El serializer debe capturar el error del modelo 'Solo un material'."""
        data = {
            "packaging": packaging_factory().id,
            "label": label_factory().id,
            "quantity_ordered": 10,
            "unit_price": "10.00",
        }
        serializer = PurchaseOrderItemSerializer(data=data)
        assert not serializer.is_valid()
        # Verificamos que el error viene de la lógica del clean del modelo
        assert "non_field_errors" in serializer.errors

    def test_invalid_price_precision(self, packaging_factory):
        """VULNERABILIDAD: El precio no puede ser negativo (Validación del campo)."""
        data = {
            "packaging": packaging_factory().id,
            "quantity_ordered": 100,
            "unit_price": "-0.01",
        }
        serializer = PurchaseOrderItemSerializer(data=data)
        assert not serializer.is_valid()
        assert "unit_price" in serializer.errors
