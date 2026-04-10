import pytest
from django.urls import reverse
from rest_framework import status
from stock.models import StockMovement


@pytest.mark.django_db
class TestStockOperationsIntegration:

    def setup_method(self):
        # La URL de la acción bulk-receive en el ViewSet de movements
        self.bulk_receive_url = reverse('stock:movement-bulk-receive')

    @pytest.fixture
    def bodeguero_client(self, api_client, user_factory):
        """El Bodeguero es quien recibe la mercancía."""
        bodeguero = user_factory(role="BODEGUERO")
        api_client.force_authenticate(user=bodeguero)
        return api_client, bodeguero

    # --- HAPPY PATH: RECEPCIÓN MASIVA + SIGNAL ---
    def test_bulk_receive_creates_stock_and_updates_po(self, bodeguero_client, batch_factory, location_factory):
        """
        HAPPY PATH: Recepción de mercancía.
        1. Crea el movimiento de entrada (IN).
        2. La Signal debe cambiar el estado de la Purchase Order a 'RECEIVED'.
        """
        client, bodeguero = bodeguero_client
        loc = location_factory(name="MUELLE_ENTRADA")
        batch = batch_factory()
        po = batch.order_item.purchase_order # Obtenemos la orden de compra
        
        # Aseguramos estado inicial
        po.status = 'DRAFT'
        po.save()

        data = {
            "items": [{
                "batch": batch.id,           # ID para la relación
                "order_item": batch.order_item.id, # El Serializer lo pide explícitamente
                "batch_number": batch.batch_number, # El Serializer lo pide explícitamente
                "location": loc.id,
                "quantity": 500,
                "notes": "Recepción técnica"
            }]
        }

        response = client.post(self.bulk_receive_url, data, format='json')
        
        # Verificaciones
        assert response.status_code == status.HTTP_201_CREATED
        
        # 1. Verificar Movimiento
        movement = StockMovement.objects.get(batch=batch)
        assert movement.movement_type == 'IN'
        assert movement.quantity == 500
        assert movement.user == bodeguero

        # 2. VERIFICAR SIGNAL: ¿Se actualizó la Purchase Order?
        po.refresh_from_db()
        assert po.status == 'PARTIAL'

    # --- EDGE CASE: RECEPCIÓN EXCESIVA ---
    def test_receive_more_than_ordered_fails(self, bodeguero_client, batch_factory, location_factory):
        """EDGE CASE: El Serializer debe frenar recepciones que superen lo pedido."""
        client, _ = bodeguero_client
        batch = batch_factory()
        
        # 1. Forzamos la lógica de tu Serializer:
        # Ponemos cantidad pedida = 100 y recibida = 0. Pendiente = 100.
        item = batch.order_item
        item.quantity_ordered = 100
        item.quantity_received = 0
        
        # 2. Aseguramos que la PO esté abierta (si no, saltaría el error de estado antes)
        po = item.purchase_order
        po.status = 'OPEN'
        po.save()
        item.save()

        # 3. Intentamos recibir 1000 (Excede los 100 pendientes)
        data = {
            "items": [{
                "order_item": item.id,      # Campo requerido por tu Serializer
                "location": location_factory().id,
                "batch_number": "BATCH-TEST-ERROR",
                "quantity": 1000,           # <--- Aquí debe saltar la validación
                "notes": "Intento de sobre-recepción"
            }]
        }

        response = client.post(self.bulk_receive_url, data, format='json')
        
        # ASERCIONES
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        
        # Buscamos el mensaje que tú mismo escribiste en el Serializer
        error_data = str(response.data)
        assert "Cantidad excedida" in error_data
        assert "100" in error_data # El pendiente que calculamos

    # --- HAPPY PATH: TRANSFERENCIA ENTRE UBICACIONES ---
    def test_transfer_stock_between_locations(self, bodeguero_client, batch_factory, location_factory):
        """HAPPY PATH: Mover stock de 'Muelle' a 'Almacén Central'."""
        client, bodeguero = bodeguero_client
        origin = location_factory(name="MUELLE")
        dest = location_factory(name="ALMACEN_CENTRAL")
        batch = batch_factory()
        
        url = reverse('stock:movement-transfer-stock')
        data = {
            "batch": batch.id,
            "origin_location": origin.id,
            "destination_location": dest.id,
            "quantity": 50
        }

        response = client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        # Debería haber creado 2 movimientos: uno de salida (-50) y uno de entrada (+50)
        assert StockMovement.objects.filter(batch=batch, movement_type='OUT').exists()
        assert StockMovement.objects.filter(batch=batch, movement_type='IN').exists()

    def test_transfer_missing_data_fails(self, bodeguero_client, batch_factory):
        """EDGE CASE: Faltan datos en la transferencia."""
        client, _ = bodeguero_client
        batch = batch_factory()
        
        # Enviamos datos incompletos (falta destination_location)
        data = {
            "batch": batch.id,
            "origin_location": 1,
            "quantity": 10
        }
        url = reverse('stock:movement-transfer-stock')
        response = client.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['detail'] == "Faltan datos para la transferencia."

    def test_transfer_happy_path_creates_two_movements(self, bodeguero_client, batch_factory, location_factory):
        """HAPPY PATH: Transferencia completa con atomicidad."""
        client, user = bodeguero_client
        loc_a = location_factory(name="ORIGEN")
        loc_b = location_factory(name="DESTINO")
        batch = batch_factory()
        url = reverse('stock:movement-transfer-stock')
        data = {
            "batch": batch.id,
            "origin_location": loc_a.id,
            "destination_location": loc_b.id,
            "quantity": 50
        }
        response = client.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        # Verificamos que se han creado los 2 registros
        movements = StockMovement.objects.filter(batch=batch)
        assert movements.count() == 2
        assert movements.filter(movement_type='OUT', quantity=-50).exists()
        assert movements.filter(movement_type='IN', quantity=50).exists()

    # --- TESTS DE DISPOSE (Retirada/Merma) ---

    def test_dispose_happy_path(self, bodeguero_client, batch_factory, location_factory):
        """HAPPY PATH: Retirada de stock por rotura o merma."""
        client, user = bodeguero_client
        batch = batch_factory()
        loc = location_factory()
        
        url = reverse('stock:movement-stock-dispose')
        data = {
            "batch": batch.id,
            "location": loc.id,
            "quantity": -5,  # Cantidad negativa para salida
            "notes": "Botella rota en picking"
        }
        response = client.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['movement_type'] == 'OUT'
        assert response.data['user'] == user.id

    # --- TESTS DE BULK RECEIVE (Recepción masiva) ---

    def test_bulk_receive_validation_error(self, bodeguero_client):
        """EDGE CASE: El serializer de bulk detecta errores (ej: items vacío)."""
        client, _ = bodeguero_client
        
        # Dependiendo de tu BulkReceptionSerializer, enviar items vacío debería dar 400
        data = {"items": []}
        response = client.post(self.bulk_receive_url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    # --- TESTS DE ATOMICIDAD ---

    def test_transfer_atomic_integrity(self, bodeguero_client, batch_factory, location_factory):
        """
        TECHNICAL TEST: Si el segundo movimiento fallara, no debería crearse el primero.
        (Simulado: enviamos un ID de destino que no existe para forzar error en el segundo create)
        """
        client, _ = bodeguero_client
        loc_a = location_factory()
        batch = batch_factory()
        
        data = {
            "batch": batch.id,
            "origin_location": loc_a.id,
            "destination_location": 99999, # ID inexistente
            "quantity": 10
        }
        url = reverse('stock:movement-transfer-stock')
        # Al no usar un Serializer que valide el ID antes, llegará al objects.create y petará
        # por integridad de base de datos (ForeignKey)
        response = client.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # Gracias al transaction.atomic(), no debe haber quedado rastro del movimiento OUT
        assert StockMovement.objects.filter(batch=batch).count() == 0