import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestSupplierSecurityEdges:

    def test_bodeguero_cannot_create_supplier(
        self, api_client, user_factory, category_factory
    ):
        """Edge Case: El rol BODEGUERO intenta saltarse la restricción de creación"""
        bodeguero = user_factory(role="BODEGUERO")
        cat = category_factory()
        api_client.force_authenticate(user=bodeguero)

        url = reverse("supplier:supplier-list")
        response = api_client.post(url, {"name": "Intento Fallido", "category": cat.id})

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_comercial_cannot_delete_supplier(
        self, api_client, user_factory, supplier_factory
    ):
        """Edge Case: El rol COMPRAS intenta borrar, lo cual solo es para ENOLOGO"""
        comercial = user_factory(role="COMPRAS")
        supplier = supplier_factory()
        api_client.force_authenticate(user=comercial)

        url = reverse("supplier:supplier-detail", kwargs={"pk": supplier.id})
        response = api_client.delete(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unknown_role_is_denied_everything(
        self, api_client, user_factory, supplier_factory
    ):
        """Edge Case: Un rol no definido en el permiso (CONTABLE) intenta modificar"""
        contable = user_factory(role="CONTABLE")
        supplier = supplier_factory()
        api_client.force_authenticate(user=contable)

        url = reverse("supplier:supplier-detail", kwargs={"pk": supplier.id})

        # Denegado el PATCH
        assert (
            api_client.patch(url, {"name": "Edit"}).status_code
            == status.HTTP_403_FORBIDDEN
        )
        # Denegado el DELETE
        assert api_client.delete(url).status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.django_db
    def test_anonymous_user_is_denied(self, api_client):
        """Test para cubrir el fallo de autenticación en el permiso"""
        url = reverse("supplier:supplier-list")
        # No usamos force_authenticate
        response = api_client.get(url)
        assert response.status_code == 401
