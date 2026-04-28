from decimal import Decimal
from test.pricing.factories import IndirectCostConfigFactory

import pytest
from django.core.exceptions import ValidationError


@pytest.mark.django_db
class TestIndirectCostConfig:

    def test_singleton_active_logic(self):
        """Verifica que solo una configuración puede estar activa."""
        config_old = IndirectCostConfigFactory(name="Antigua", is_active=True)
        config_new = IndirectCostConfigFactory(name="Nueva", is_active=True)

        config_old.refresh_from_db()

        assert config_new.is_active is True
        assert config_old.is_active is False

    def test_labor_rate_max_validation(self):
        """Verifica el MaxValueValidator(1) en labor_rate."""
        # Creamos una instancia con un valor inválido (> 1)
        config = IndirectCostConfigFactory.build(labor_rate=Decimal("1.0100"))

        with pytest.raises(ValidationError) as excinfo:
            config.full_clean()

        assert "labor_rate" in excinfo.value.message_dict

    def test_negative_rate_validation(self):
        """Verifica el MinValueValidator(0)."""
        config = IndirectCostConfigFactory.build(energy_rate=Decimal("-0.0100"))

        with pytest.raises(ValidationError) as excinfo:
            config.full_clean()

        assert "energy_rate" in excinfo.value.message_dict

    def test_happy_path_at_limits(self):
        """Verifica que los valores frontera (0 y 1) son válidos."""
        config = IndirectCostConfigFactory.build(
            labor_rate=Decimal("0.0000"),
            energy_rate=Decimal("1.0000"),
            amortization_rate=Decimal("0.5000"),
        )
        # No debe lanzar excepción
        config.full_clean()
        config.save()
        assert config.pk is not None
