import pytest
from rest_framework.exceptions import ValidationError

from stock.models import StockMovement
from stock.serializers import StockTransferSerializer


@pytest.mark.django_db
class TestStockTransferSerializer:

    @pytest.fixture
    def setup_stock(self, batch_factory, location_factory, user_factory):
        """Preparamos un lote con stock inicial en una ubicación."""
        user = user_factory()
        loc_origin = location_factory(name="ORIGEN")
        loc_dest = location_factory(name="DESTINO")
        batch = batch_factory()

        # Creamos una entrada inicial de 100 unidades
        StockMovement.objects.create(
            batch=batch,
            location=loc_origin,
            quantity=100,
            movement_type="IN",
            user=user,
        )

        return {"batch": batch, "origin": loc_origin, "dest": loc_dest, "user": user}

    # --- HAPPY PATH ---
    def test_transfer_valid_data(self, setup_stock):
        """HAPPY PATH: Transferencia válida con stock suficiente."""
        data = {
            "batch": setup_stock["batch"].id,
            "origin_location": setup_stock["origin"].id,
            "destination_location": setup_stock["dest"].id,
            "quantity": 50,
            "notes": "Traslado parcial",
        }

        serializer = StockTransferSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["quantity"] == 50

    # --- VALIDACIONES Y EDGE CASES ---

    def test_transfer_insufficient_stock_fails(self, setup_stock):
        """VALIDACIÓN: No se puede transferir más de lo que hay en el origen."""
        data = {
            "batch": setup_stock["batch"].id,
            "origin_location": setup_stock["origin"].id,
            "destination_location": setup_stock["dest"].id,
            "quantity": 150,  # Intentamos mover 150 pero solo hay 100
        }

        serializer = StockTransferSerializer(data=data)

        with pytest.raises(ValidationError) as excinfo:
            serializer.is_valid(raise_exception=True)

        assert "Stock insuficiente" in str(excinfo.value)

    def test_transfer_same_location_fails(self, setup_stock):
        """EDGE CASE: El origen y el destino no pueden ser el mismo."""
        data = {
            "batch": setup_stock["batch"].id,
            "origin_location": setup_stock["origin"].id,
            "destination_location": setup_stock["origin"].id,  # MISMO DESTINO
            "quantity": 10,
        }

        serializer = StockTransferSerializer(data=data)

        with pytest.raises(ValidationError) as excinfo:
            serializer.is_valid(raise_exception=True)

        assert "destino no puede ser igual a la de origen" in str(excinfo.value)

    def test_transfer_negative_quantity_fails(self, setup_stock):
        """VALIDACIÓN: La cantidad debe ser positiva (min_value=1)."""
        data = {
            "batch": setup_stock["batch"].id,
            "origin_location": setup_stock["origin"].id,
            "destination_location": setup_stock["dest"].id,
            "quantity": -5,
        }

        serializer = StockTransferSerializer(data=data)
        assert not serializer.is_valid()
        assert "quantity" in serializer.errors

    def test_transfer_stock_sum_logic(self, setup_stock):
        """
        VALIDACIÓN COMPLEJA: El cálculo debe considerar entradas y salidas previas.
        Si hay +100 y luego un ajuste de -60, quedan 40. Mover 50 debe fallar.
        """
        # Añadimos un movimiento de salida (OUT) previo
        StockMovement.objects.create(
            batch=setup_stock["batch"],
            location=setup_stock["origin"],
            quantity=-60,
            movement_type="OUT",
            user=setup_stock["user"],
        )

        data = {
            "batch": setup_stock["batch"].id,
            "origin_location": setup_stock["origin"].id,
            "destination_location": setup_stock["dest"].id,
            "quantity": 50,  # 100 - 60 = 40. Intentar 50 debe fallar.
        }

        serializer = StockTransferSerializer(data=data)
        assert not serializer.is_valid()
        assert "Stock insuficiente" in str(serializer.errors["quantity"])
