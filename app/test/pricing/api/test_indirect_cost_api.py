from test.pricing.factories import IndirectCostConfigFactory

import pytest
from django.urls import reverse
from rest_framework import status

from pricing.models import IndirectCostConfig


@pytest.mark.django_db
class TestIndirectCostsAPI:
    
    def setup_method(self):
        self.list_url = reverse('pricing:indirect-cost-list')

    # --- HAPPY PATH ---
    def test_create_config_and_activation_toggle(self, user_factory,api_client):
        """Verifica que al crear una activa, se desactivan las anteriores."""
        user = user_factory(role="ENOLOGO")
        api_client.force_authenticate(user=user)

        IndirectCostConfigFactory(is_active=True, name="Antigua")
        
        data = {
            "name": "Nueva Tasa 2026",
            "labor_rate": "0.1000",
            "energy_rate": "0.0500",
            "amortization_rate": "0.0200",
            "is_active": True
        }
        
        response = api_client.post(self.list_url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert IndirectCostConfig.objects.filter(is_active=True).count() == 1
        assert IndirectCostConfig.objects.get(name="Antigua").is_active is False

    # --- VALIDACIONES ---
    def test_prevent_negative_rates(self, user_factory,api_client):
        """Verifica que el API rechaza tasas negativas (Validación Serializer)."""
        user = user_factory(role="ENOLOGO")
        api_client.force_authenticate(user=user)

        data = {
            "name": "Error",
            "labor_rate": "-0.0500",
            "energy_rate": "0.0500",
            "amortization_rate": "0.0500"
        }
        response = api_client.post(self.list_url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "labor_rate" in response.data

    # --- FILTROS ---
    def test_filter_by_name(self, user_factory,api_client):
        """Verifica la búsqueda por nombre."""
        user = user_factory(role="ENOLOGO")
        api_client.force_authenticate(user=user)

        IndirectCostConfigFactory(name="Especial")
        IndirectCostConfigFactory(name="Normal")
        
        response = api_client.get(f"{self.list_url}?search=Especial")
        assert len(response.data) == 1
        assert response.data[0]['name'] == "Especial"