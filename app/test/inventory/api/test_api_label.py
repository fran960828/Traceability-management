import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestLabelAPI:

    def get_url(self, name="list", pk=None):
        if name == "list":
            return reverse("inventory:label-list")
        return reverse("inventory:label-detail", kwargs={"pk": pk})

    # ==========================================================================
    # 1. MATRIZ DE PERMISOS (BODEGUERO vs COMPRAS vs ENOLOGO)
    # ==========================================================================

    def test_bodeguero_read_only_labels(self, api_client, user_factory):
        """BODEGUERO: Solo puede consultar el catálogo de etiquetas"""
        user = user_factory(username="bodeguero_label", role="BODEGUERO")
        api_client.force_authenticate(user=user)

        # Ver lista: OK
        response = api_client.get(self.get_url("list"))
        assert response.status_code == status.HTTP_200_OK

        # Intentar crear: Prohibido
        response_post = api_client.post(self.get_url("list"), {"name": "HACK"})
        assert response_post.status_code == status.HTTP_403_FORBIDDEN

    def test_compras_can_create_but_not_delete_labels(
        self, api_client, user_factory, label_material, supplier
    ):
        """COMPRAS: Puede dar de alta etiquetas nuevas pero no borrarlas"""
        user = user_factory(username="compras_label", role="COMPRAS")
        api_client.force_authenticate(user=user)

        # Crear: OK
        data = {
            "name": "NUEVA ETIQUETA",
            "supplier": supplier.id,
            "label_type": "FRONTAL",
            "brand_reference": "TEST BRAND",
            "vintage": 2024,
            "unit_mesure": "MILLAR",
        }
        response = api_client.post(self.get_url("list"), data)
        assert response.status_code == status.HTTP_201_CREATED

        # Borrar: Prohibido
        url_detail = self.get_url("detail", pk=label_material.pk)
        response_delete = api_client.delete(url_detail)
        assert response_delete.status_code == status.HTTP_403_FORBIDDEN

    # ==========================================================================
    # 2. HAPPY PATH & LÓGICA DE NEGOCIO (LABELS)
    # ==========================================================================

    def test_create_label_sanitization(self, api_client, supplier, user_factory):
        """POST: El nombre y la marca deben limpiarse (Mayúsculas y espacios)"""
        user = user_factory(username="compras_label", role="COMPRAS")
        api_client.force_authenticate(user=user)
        data = {
            "name": "   etiqueta tinto crianza   ",
            "supplier": supplier.id,
            "label_type": "FRONTAL",
            "brand_reference": "   bodega real   ",
            "vintage": 2022,
            "unit_mesure": "MILLAR",
            "min_stock_level": 10,
        }
        response = api_client.post(self.get_url("list"), data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "ETIQUETA TINTO CRIANZA"
        assert response.data["brand_reference"] == "BODEGA REAL"
        assert "ETI-" in response.data["internal_code"]

    # ==========================================================================
    # 3. EDGE CASES (Añada obligatoria y Unidades)
    # ==========================================================================

    def test_vintage_is_mandatory_api(self, api_client, supplier, user_factory):
        """Edge Case: La API debe rechazar etiquetas sin añada (vintage)"""
        user = user_factory(username="compras_label", role="COMPRAS")
        api_client.force_authenticate(user=user)

        data = {
            "name": "ETIQUETA SIN AÑO",
            "supplier": supplier.id,
            "label_type": "FRONTAL",
            "brand_reference": "BRAND",
            "vintage": None,  # Enviamos nulo explícito
            "unit_mesure": "UNIDAD",
        }
        response = api_client.post(self.get_url("list"), data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "vintage" in response.data

    def test_label_unit_mesure_allowed(self, api_client, supplier, user_factory):
        """Edge Case: Las etiquetas SI permiten MILLAR y UNIDAD (a diferencia de enología)"""
        user = user_factory(username="compras_label", role="COMPRAS")
        api_client.force_authenticate(user=user)

        for unit in ["MILLAR", "UNIDAD"]:
            data = {
                "name": f"ETIQUETA {unit}",
                "supplier": supplier.id,
                "label_type": "FRONTAL",
                "brand_reference": "BRAND",
                "vintage": 2024,
                "unit_mesure": unit,
            }
            response = api_client.post(self.get_url("list"), data)
            assert response.status_code == status.HTTP_201_CREATED

    # ==========================================================================
    # 4. FILTERS
    # ==========================================================================

    def test_filter_labels_by_vintage_and_type(self, auth_client, label_factory):
        """Filters: Combinar filtros de añada y tipo de etiqueta"""
        label_factory(vintage=2020, label_type="FRONTAL")
        label_factory(vintage=2024, label_type="FRONTAL")
        label_factory(vintage=2024, label_type="CONTRA")

        # Filtramos por año 2024
        response = auth_client.get(self.get_url("list"), {"vintage": 2024})
        assert len(response.data) == 2

        # Filtramos por año 2024 Y tipo FRONT
        response = auth_client.get(
            self.get_url("list"), {"vintage": 2024, "label_type": "FRONTAL"}
        )
        assert len(response.data) == 1
