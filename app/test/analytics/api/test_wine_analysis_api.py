from datetime import date, timedelta

import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestWineAnalysisViewSet:

    def setup_method(self):
        # URL base para los análisis
        self.list_url = reverse("analytics:analysis-list")

    # --- HAPPY PATH ---

    def test_list_analyses_authenticated(self, auth_client, analysis_dop_premium):
        """Verifica que un usuario autenticado puede listar los análisis."""
        response = auth_client.get(self.list_url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        # Verificamos que el wine_name (Read Only) aparece en la respuesta
        assert response.data[0]["wine_name"] == analysis_dop_premium.wine.name

    def test_create_analysis_via_api(
        self, auth_client, production_order_factory, user_factory
    ):
        """Prueba la creación de un análisis a través de POST."""
        order = production_order_factory()
        payload = {
            "production_order": order.id,
            "analysis_date": str(date.today()),
            "alcohol_content": "14.20",
            "ph": "3.55",
            "volatile_acidity": "0.42",
            "total_acidity": "5.10",
            "reducing_sugars": "1.20",
            "malic_acid": "0.05",
            "lactic_acid": "1.40",
            "IC": "15.00",
            "folin_index": "70.00",
            "gluconic_acid": "0.10",
            "laboratory": "Lab Externo S.L.",
        }
        user = user_factory(username="boss", role="ENOLOGO")
        auth_client.force_authenticate(user=user)

        response = auth_client.post(self.list_url, data=payload)

        assert response.status_code == status.HTTP_201_CREATED
        assert (
            response.data["laboratory"] == "LAB EXTERNO S.L."
        )  # Test de limpieza upper/strip

    # --- EDGE CASES: FILTRADO Y BÚSQUEDA ---

    def test_filter_by_date_range(
        self, auth_client, analysis_factory, production_order_factory
    ):
        """Verifica el filtrado 'desde-hasta' de las fechas de análisis."""
        order = production_order_factory()
        today = date.today()

        # 1. Creamos 3 análisis en fechas distintas
        analysis_factory(
            production_order=order, analysis_date=today - timedelta(days=20)
        )
        analysis_factory(
            production_order=order, analysis_date=today - timedelta(days=10)
        )
        analysis_factory(production_order=order, analysis_date=today)

        # 2. Filtramos para pillar solo los dos últimos (últimos 15 días)
        start_date = str(today - timedelta(days=15))
        response = auth_client.get(self.list_url, {"start_date": start_date})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_search_by_wine_name(
        self, auth_client, analysis_factory, production_order_factory, wine_factory
    ):
        """Verifica la búsqueda por el nombre del vino vinculado a la orden."""
        wine_a = wine_factory(name="ALBARIÑO ONTALBA")
        wine_b = wine_factory(name="TEMPRANILLO ROBLE")

        order_a = production_order_factory(wine=wine_a)
        order_b = production_order_factory(wine=wine_b)

        analysis_factory(production_order=order_a)
        analysis_factory(production_order=order_b)

        # Buscamos "Albariño"
        response = auth_client.get(self.list_url, {"search": "Albariño"})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert "ALBARIÑO" in response.data[0]["wine_name"]

    def test_create_invalid_range_blocks_api(
        self, auth_client, production_order_factory, user_factory
    ):
        """Verifica que el ViewSet devuelve 400 si el modelo lanza ValidationError."""
        order = production_order_factory()
        payload = {
            "production_order": order.id,
            "analysis_date": str(date.today()),
            "alcohol_content": "25.00",  # Valor ilegal (>22)
            "ph": "3.50",
        }
        user = user_factory(username="boss", role="ENOLOGO")
        auth_client.force_authenticate(user=user)

        response = auth_client.post(self.list_url, data=payload)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "alcohol_content" in response.data
