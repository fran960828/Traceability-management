import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestLotTraceabilityViewSet:

    # --- HAPPY PATH ---

    def test_retrieve_by_lot_number_path(self, api_client, user_factory, orden_trazada_y_confirmada):
        """Verifica que la URL semántica con el lot_number funciona."""
        user = user_factory(role="BODEGUERO")
        api_client.force_authenticate(user=user)
        
        lot = orden_trazada_y_confirmada.lot_number
        # Genera: /api/traceability/lot-traceability/L26-XXX/
        url = reverse('traceability:lot-traceability-detail', kwargs={'lot_number': lot})
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['content']['order_details']['lot_number'] == lot
        assert response.data['integrity_status']['valid'] is True

    def test_list_traceability_records(self, api_client, user_factory, orden_trazada_y_confirmada):
        """Verifica que el listado general carga correctamente."""
        user = user_factory(role="BODEGUERO")
        api_client.force_authenticate(user=user)
        
        url = reverse('traceability:lot-traceability-list')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    # --- FILTROS Y BÚSQUEDA ---

    def test_filter_by_wine_name_in_snapshot(self, api_client, user_factory, orden_trazada_y_confirmada):
        """Prueba el filtro por nombre de vino que 'bucea' en el JSON."""
        user = user_factory(role="BODEGUERO")
        api_client.force_authenticate(user=user)
        
        wine_name = orden_trazada_y_confirmada.wine.name
        url = reverse('traceability:lot-traceability-list')
        
        response = api_client.get(url, {'wine_name': wine_name})
        
        assert response.status_code == status.HTTP_200_OK
        # Verificamos que el resultado filtrado contiene el nombre buscado
        assert all(wine_name in r['content']['order_details']['wine_name'] for r in response.data)

    def test_search_filter_global(self, api_client, user_factory, orden_trazada_y_confirmada):
        """Prueba el SearchFilter configurado en el ViewSet."""
        user = user_factory(role="BODEGUERO")
        api_client.force_authenticate(user=user)
        
        lot = orden_trazada_y_confirmada.lot_number
        url = reverse('traceability:lot-traceability-list')
        
        # El search_fields incluía el lot_number
        response = api_client.get(url, {'search': lot})
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data[0]['content']['order_details']['lot_number'] == lot

    # --- EDGE CASES ---

    def test_retrieve_non_existent_lot(self, api_client, user_factory):
        """Verifica que un lote inexistente devuelve 404."""
        user = user_factory(role="BODEGUERO")
        api_client.force_authenticate(user=user)
        
        url = reverse('traceability:lot-traceability-detail', kwargs={'lot_number': 'LOTE-FANTASMA'})
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    # --- VALIDACIONES Y PERMISOS ---

    def test_readonly_methods_only(self, api_client, user_factory, orden_trazada_y_confirmada):
        """
        Garantiza que el ReadOnlyModelViewSet bloquea POST/PUT/DELETE.
        """
        user = user_factory(role="ENOLOGO")
        api_client.force_authenticate(user=user)
        lot = orden_trazada_y_confirmada.lot_number
        url = reverse('traceability:lot-traceability-detail', kwargs={'lot_number': lot})

        # Intentar borrar
        assert api_client.delete(url).status_code == status.HTTP_405_METHOD_NOT_ALLOWED
        # Intentar crear
        assert api_client.post(reverse('traceability:lot-traceability-list'), {}).status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_permission_denied_for_wrong_role(self, api_client, user_factory, orden_trazada_y_confirmada):
        """Verifica que un usuario sin el rol adecuado no accede."""
        # Suponiendo que 'INVITADO' no tiene acceso en PurchaseRolePermission
        user = user_factory(role="INVITADO") 
        api_client.force_authenticate(user=user)
        
        url = reverse('traceability:lot-traceability-list')
        response = api_client.get(url)
        
        # Dependiendo de tu PurchaseRolePermission, será 403 Forbidden
        assert response.status_code == status.HTTP_403_FORBIDDEN