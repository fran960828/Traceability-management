import pytest
from django.urls import reverse
from rest_framework import status

from pricing.models import ProductionCosting
from pricing.utils.services import CostingService


@pytest.mark.django_db
class TestProductionCostingAPI:

    def setup_method(self):
        self.list_url = reverse('pricing:production-costing-list')

    # --- HAPPY PATH: INTEGRACIÓN TOTAL + SIGNAL ---
    def test_flow_confirmation_to_costing_api(self, user_factory, api_client, escenario_escandallo_completo):
        """
        Test de integración total:
        1. Confirma la orden (dispara logic + signals de trazabilidad y precios).
        2. Consulta el endpoint de costes usando el LOTE en la URL.
        """
        # Autenticación con rol permitido
        user = user_factory(role="ENOLOGO")
        api_client.force_authenticate(user=user)
        
        order = escenario_escandallo_completo
        
        confirm_url = reverse('production_record:order-confirm', kwargs={'pk': order.pk})
        
        # 1. Confirmamos la orden vía API
        resp_confirm = api_client.post(confirm_url)
        assert resp_confirm.status_code == status.HTTP_200_OK
        
        # 2. Verificamos que la SEÑAL creó el objeto en la base de datos
        assert ProductionCosting.objects.filter(production_order=order).exists()
        
        # 3. Consultamos el detalle del coste usando el lot_number (lookup_field)
        detail_url = reverse('pricing:production-costing-detail', kwargs={'lot_number': order.lot_number})
        response = api_client.get(detail_url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['order_lot'] == order.lot_number
        assert response.data['unit_cost'] == "3.77"  # Verificamos redondeo a 2 decimales
        assert isinstance(response.data['materials_snapshot'], dict)

    # --- EDGE CASES: READ ONLY ---
    def test_production_costing_is_readonly(self, user_factory, api_client, production_order_factory):
        """Verifica que el endpoint es ReadOnly y rechaza métodos de escritura."""
        user = user_factory(role="ENOLOGO")
        api_client.force_authenticate(user=user)

        response = api_client.post(self.list_url, {"unit_cost": "10.00"})
        # ReadOnlyModelViewSet debe devolver 405 Method Not Allowed
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    # --- FILTROS ---
    def test_filter_costs_by_wine(self, user_factory, api_client, escenario_escandallo_completo):
        """Verifica el filtrado de escandallos por el ID del vino."""
        user = user_factory(role="ENOLOGO")
        api_client.force_authenticate(user=user)

        # Generamos el escandallo manualmente para el test de filtrado
        CostingService.generate_escandallo(escenario_escandallo_completo)
        
        wine_id = escenario_escandallo_completo.wine.id
        response = api_client.get(f"{self.list_url}?wine={wine_id}")
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['wine_name'] == escenario_escandallo_completo.wine.name

    def test_search_by_lot_number(self, user_factory, api_client, escenario_escandallo_completo):
        """Verifica la búsqueda global por número de lote."""
        user = user_factory(role="ENOLOGO")
        api_client.force_authenticate(user=user)
        
        CostingService.generate_escandallo(escenario_escandallo_completo)
        lot = escenario_escandallo_completo.lot_number
        
        response = api_client.get(f"{self.list_url}?search={lot}")
        assert response.status_code == status.HTTP_200_OK
        assert any(item['order_lot'] == lot for item in response.data)