import pytest
from decimal import Decimal
from pricing.serializers import IndirectCostConfigSerializer
from pricing.models import IndirectCostConfig
from test.pricing.factories import IndirectCostConfigFactory

@pytest.mark.django_db
class TestIndirectCostConfigSerializer:

    # --- HAPPY PATH ---
    def test_serialize_valid_data(self):
        """Verifica que los datos válidos se procesan correctamente."""
        data = {
            "name": "Tasas Verano 2026",
            "labor_rate": "0.0600",
            "energy_rate": "0.0900",
            "amortization_rate": "0.0300",
            "is_active": True
        }
        serializer = IndirectCostConfigSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        
        config = serializer.save()
        assert config.name == "Tasas Verano 2026"
        assert config.labor_rate == Decimal("0.0600")

    # --- EDGE CASES / LOGIC ---
    def test_activation_toggle_on_create(self):
        """Verifica que al crear uno activo, se desactivan los demás (Atomicidad)."""
        # Creamos uno ya activo
        IndirectCostConfigFactory(is_active=True, name="Antiguo")
        
        data = {
            "name": "Nuevo Activo",
            "labor_rate": "0.05",
            "energy_rate": "0.05",
            "amortization_rate": "0.05",
            "is_active": True
        }
        serializer = IndirectCostConfigSerializer(data=data)
        serializer.is_valid()
        serializer.save()
        
        assert IndirectCostConfig.objects.filter(is_active=True).count() == 1
        assert IndirectCostConfig.objects.get(name="Nuevo Activo").is_active is True
        assert IndirectCostConfig.objects.get(name="Antiguo").is_active is False

    # --- VALIDATIONS ---
    def test_validate_negative_rates(self):
        """Verifica que no se permitan tasas negativas."""
        data = {
            "name": "Tasas Negativas",
            "labor_rate": "-0.0100",
            "energy_rate": "0.0500",
            "amortization_rate": "0.0500"
        }
        serializer = IndirectCostConfigSerializer(data=data)
        assert not serializer.is_valid()
        assert "labor_rate" in serializer.errors
        assert "La tasa de mano de obra no puede ser negativa." in str(serializer.errors["labor_rate"])

    def test_validate_missing_fields(self):
        """Verifica que campos obligatorios lancen error si faltan."""
        serializer = IndirectCostConfigSerializer(data={"name": "Incompleto"})
        assert not serializer.is_valid()
        # labor_rate, energy_rate y amortization_rate son obligatorios en el modelo
        assert "labor_rate" in serializer.errors