import pytest

from stock.serializers import StockMovementSerializer,StockAdjustmentSerializer


@pytest.mark.django_db
class TestStockMovementSerializer:

    # --- HAPPY PATH: LECTURA (LIST/RETRIEVE) ---
    def test_movement_serializer_read_data(
        self, stock_movement_factory, rf, admin_user
    ):
        """HAPPY PATH: El serializer entrega datos legibles, incluyendo el nombre del usuario."""
        movement = stock_movement_factory(
            quantity=100, movement_type="IN", user=admin_user
        )

        # Mock del contexto para que funcione el campo user_full_name
        request = rf.get("/")
        request.user = admin_user

        serializer = StockMovementSerializer(
            instance=movement, context={"request": request}
        )

        assert serializer.data["batch_number"] == movement.batch.batch_number
        assert serializer.data["user_full_name"] == admin_user.get_full_name()
        assert serializer.data["movement_type"] == "IN"

    # --- HAPPY PATH: ESCRITURA (AJUSTES) ---
    # Importa tu nuevo serializador arriba en el archivo de tests:
# from stock.serializers import StockAdjustmentSerializer, StockMovementSerializer

    # --- HAPPY PATH ---
    def test_movement_serializer_adjustment_valid(
        self, batch_con_po, location_factory, rf, admin_user, stock_movement_factory
    ):
        """HAPPY PATH: El serializer de ajuste permite crear una merma inyectando el usuario."""
        loc = location_factory()
        
        # 🟢 CORRECCIÓN 1: Inyectamos stock previo para que el validador no rebote la merma
        stock_movement_factory(
            batch=batch_con_po, location=loc, quantity=10, movement_type="IN", user=admin_user
        )

        data = {
            "batch": batch_con_po.id,
            "location": loc.id,
            "quantity": -5,
            "notes": "Rotura detectada",
        }

        request = rf.post("/")
        request.user = admin_user

        # 🟢 CORRECCIÓN 2: Apuntamos al serializador correcto de escritura (POST)
        serializer = StockAdjustmentSerializer(data=data, context={"request": request})
        assert serializer.is_valid(), serializer.errors

        # Guardamos pasando los datos contextuales como haría la vista
        movement = serializer.save(movement_type="ADJ", user=request.user)

        assert movement.quantity == -5
        assert movement.user == admin_user
        assert movement.movement_type == "ADJ"

    # --- VALIDACIONES ---
    def test_movement_serializer_zero_quantity_fails(
        self, batch_con_po, location_factory, rf
    ):
        """VALIDACIÓN: No se puede registrar un ajuste de 0 unidades."""
        data = {
            "batch": batch_con_po.id,
            "location": location_factory().id,
            "quantity": 0,
            "notes": "Ajuste nulo",
        }
        request = rf.post("/")
        
        # 🟢 CORRECCIÓN 3: Apuntamos a StockAdjustmentSerializer
        serializer = StockAdjustmentSerializer(data=data, context={"request": request})

        assert not serializer.is_valid()
        assert "quantity" in serializer.errors

    # --- EDGE CASES ---
    def test_movement_serializer_readonly_fields_behavior(
        self, batch_con_po, location_factory, rf, admin_user, stock_movement_factory
    ):
        """EDGE CASE: Los campos readonly en el ajuste (user, id) son ignorados si se manipulan."""
        loc = location_factory()
        
        # Inyectamos stock para el caso positivo
        stock_movement_factory(
            batch=batch_con_po, location=loc, quantity=20, movement_type="IN", user=admin_user
        )

        data = {
            "batch": batch_con_po.id,
            "location": loc.id,
            "quantity": -10,
            "user": 999,  # Intento de suplantación en un campo readonly del ajuste
            "notes": "Ajuste de control",
        }

        request = rf.post("/")
        request.user = admin_user

        # 🟢 CORRECCIÓN 4: Apuntamos a StockAdjustmentSerializer
        serializer = StockAdjustmentSerializer(data=data, context={"request": request})
        assert serializer.is_valid(), serializer.errors

        movement = serializer.save(movement_type="ADJ", user=request.user)

        # Prevalece el usuario inyectado por la vista, ignorando el '999' del JSON
        assert movement.quantity == -10
        assert movement.user == admin_user
