import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestSupplierFilters:

    def test_filter_suppliers_by_category(
        self, auth_client, supplier_factory, category_factory
    ):
        """Verifica que el parámetro ?category=ID filtra correctamente"""
        # 1. Creamos dos categorías
        cat_vidrio = category_factory(name="Vidrio")
        cat_corcho = category_factory(name="Corcho")

        # 2. Creamos proveedores en ambas
        supplier_factory(name="Vidrios Rioja", category=cat_vidrio)
        supplier_factory(name="Vidrios La Mancha", category=cat_vidrio)
        supplier_factory(name="Corchos Albacete", category=cat_corcho)

        url = reverse("supplier:supplier-list")

        # 3. Petición filtrando por Vidrio
        response = auth_client.get(f"{url}?category={cat_vidrio.id}")

        assert response.status_code == status.HTTP_200_OK
        # Deben venir exactamente 2, no los 3
        assert len(response.data) == 2
        assert all(s["category_name"] == "VIDRIO" for s in response.data)

    def test_search_suppliers_by_name_or_tax_id(self, auth_client, supplier_factory):
        """Verifica que el parámetro ?search= filtra por nombre o NIF"""
        supplier_factory(name="Bodegas Ontalba", tax_id="B12345678")
        supplier_factory(name="Transportes Garcia", tax_id="A99999999")

        url = reverse("supplier:supplier-list")

        # A. Búsqueda por nombre parcial
        response_name = auth_client.get(f"{url}?search=Ontalba")
        assert len(response_name.data) == 1
        assert response_name.data[0]["name"] == "Bodegas Ontalba"

        # B. Búsqueda por tax_id
        response_tax = auth_client.get(f"{url}?search=A9999")
        assert len(response_tax.data) == 1
        assert response_tax.data[0]["name"] == "Transportes Garcia"
