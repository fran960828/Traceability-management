import pytest
from stock.serializers import StockMovementSerializer

@pytest.mark.django_db
class TestStockMovementSerializer:

    # --- HAPPY PATH: LECTURA (LIST/RETRIEVE) ---
    def test_movement_serializer_read_data(self, stock_movement_factory, rf, admin_user):
        """HAPPY PATH: El serializer entrega datos legibles, incluyendo el nombre del usuario."""
        movement = stock_movement_factory(quantity=100, movement_type='IN', user=admin_user)
        
        # Mock del contexto para que funcione el campo user_full_name
        request = rf.get('/')
        request.user = admin_user
        
        serializer = StockMovementSerializer(instance=movement, context={'request': request})
        
        assert serializer.data['batch_number'] == movement.batch.batch_number
        assert serializer.data['user_full_name'] == admin_user.get_full_name()
        assert serializer.data['movement_type'] == 'IN'

    # --- HAPPY PATH: ESCRITURA (AJUSTES) ---
    def test_movement_serializer_adjustment_valid(self, batch_con_po, location_factory, rf, admin_user):
        """HAPPY PATH: El serializer permite crear un ajuste manual inyectando el usuario del contexto."""
        loc = location_factory()
        data = {
            "batch": batch_con_po.id,
            "location": loc.id,
            "quantity": -5,
            "notes": "Rotura detectada"
        }
        
        request = rf.post('/')
        request.user = admin_user
        
        serializer = StockMovementSerializer(data=data, context={'request': request})
        assert serializer.is_valid(), serializer.errors
        
        # Guardamos pasando el tipo (como haría el ViewSet) y el usuario del request
        movement = serializer.save(movement_type='ADJ', user=request.user)
        
        assert movement.quantity == -5
        assert movement.user == admin_user
        assert movement.movement_type == 'ADJ'

    # --- VALIDACIONES ---
    def test_movement_serializer_zero_quantity_fails(self, batch_con_po, location_factory, rf):
        """VALIDACIÓN: No se puede registrar un movimiento de 0 unidades."""
        data = {
            "batch": batch_con_po.id,
            "location": location_factory().id,
            "quantity": 0
        }
        # Incluso para fallar en validación, es buena práctica pasar el contexto si el serializer lo espera
        request = rf.post('/')
        serializer = StockMovementSerializer(data=data, context={'request': request})
        
        assert not serializer.is_valid()
        assert 'quantity' in serializer.errors

    # --- EDGE CASES ---
    def test_movement_serializer_readonly_fields_behavior(self, batch_con_po, location_factory, rf, admin_user):
        """EDGE CASE: Los campos readonly (user, type, date) son ignorados aunque se envíen en el JSON."""
        data = {
            "batch": batch_con_po.id,
            "location": location_factory().id,
            "quantity": 10,
            "movement_type": "IN", # Intento de manipulación
            "user": 999,           # Intento de suplantación
        }
        
        request = rf.post('/')
        request.user = admin_user
        
        serializer = StockMovementSerializer(data=data, context={'request': request})
        assert serializer.is_valid()
        
        # Prevalece la lógica del ViewSet/Contexto
        movement = serializer.save(movement_type='ADJ', user=request.user)
        
        assert movement.movement_type == 'ADJ'
        assert movement.user == admin_user