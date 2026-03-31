import pytest
from django.urls import reverse
from rest_framework import status

@pytest.mark.django_db
class TestPurchaseOrderItemViewSet:

    def setup_method(self):
        self.list_url = reverse("purchase:order-item-list")

    # --- HAPPY PATH ---
    def test_list_items_with_material_names(self, auth_client, purchase_order_item_factory):
        """HAPPY PATH: Listar ítems y verificar que el nombre del material viene incluido."""
        item = purchase_order_item_factory()
        
        response = auth_client.get(self.list_url)
        
        assert response.status_code == status.HTTP_200_OK
        # Verificamos que el ReadOnlyField 'material_name' que definimos funciona
        assert "material_name" in response.data[0]
        assert response.data[0]["material_name"] is not None

    # --- FILTERS ---
    def test_filter_items_by_purchase_order(self, auth_client, purchase_order_factory, purchase_order_item_factory):
        """FILTER: Buscar solo los ítems pertenecientes a una orden específica."""
        order1 = purchase_order_factory()
        order2 = purchase_order_factory()
        purchase_order_item_factory(purchase_order=order1)
        purchase_order_item_factory(purchase_order=order2)
        
        response = auth_client.get(self.list_url, {"purchase_order": order1.id})
        
        assert len(response.data) == 1
        assert response.data[0]["purchase_order"] == order1.id

    def test_search_items_by_material_name(self, auth_client, packaging_factory, purchase_order_item_factory):
        """FILTER: Búsqueda por texto (SearchFilter) en el nombre del packaging."""
        pack = packaging_factory(name="Corcho Especial")
        purchase_order_item_factory(packaging=pack)
        purchase_order_item_factory(packaging=packaging_factory(name="Cápsula"))
        
        response = auth_client.get(self.list_url, {"search": "Corcho"})
        
        assert len(response.data) == 1
        assert "CORCHO" in response.data[0]["material_name"]

    # --- EDGE CASES ---
    def test_bodeguero_user_cannot_delete_item(self, auth_client, user_factory, purchase_order_item_factory):
        """EDGE CASE: El rol COMPRAS no puede borrar líneas (auditoría)."""
        user = user_factory(username="bodeguero1", role="BODEGUERO")
        auth_client.force_authenticate(user=user)
        item = purchase_order_item_factory()
        
        url = reverse("purchase:order-item-detail", kwargs={"pk": item.id})
        response = auth_client.delete(url)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN