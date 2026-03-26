import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestSupplierHappyPath:

    def test_list_suppliers_authenticated(self, auth_client, supplier_factory):
        """Verifica que un usuario logueado puede ver la lista de proveedores"""
        supplier_factory(name="Prov 1", tax_id="11111111A")
        supplier_factory(name="Prov 2", tax_id="22222222B")

        url = reverse("supplier:supplier-list")
        response = auth_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 2

    def test_enologo_can_create_supplier(
        self, api_client, user_factory, category_factory
    ):
        """Verifica que el rol ENOLOGO puede crear y genera el código PROV-"""
        enologo = user_factory(role="ENOLOGO")
        cat = category_factory()
        api_client.force_authenticate(user=enologo)

        data = {
            "name": "Nuevo Proveedor S.L.",
            "tax_id": "B99888777",
            "category": cat.id,
            "email_pedidos": "pedidos@nuevo.com",
        }
        url = reverse("supplier:supplier-list")
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert "PROV-" in response.data["supplier_code"]

    def test_comercial_can_update_supplier(
        self, api_client, user_factory, supplier_factory
    ):
        """Verifica que el rol COMPRAS/COMERCIAL puede editar datos"""
        comercial = user_factory(role="COMPRAS")
        supplier = supplier_factory(name="Original")
        api_client.force_authenticate(user=comercial)

        url = reverse("supplier:supplier-detail", kwargs={"pk": supplier.id})
        response = api_client.patch(url, {"name": "Nombre Editado"})

        assert response.status_code == status.HTTP_200_OK
