from datetime import date
from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError


@pytest.mark.django_db
class TestWineAnalysis:

    def test_create_valid_analysis(
        self, analysis_factory, production_order_factory, wine_glass_dop
    ):
        """Verifica que un análisis con datos perfectos se guarda y asocia bien a través de la orden."""
        # Creamos una orden específica para asegurar la cadena
        order = production_order_factory(wine=wine_glass_dop)

        analysis = analysis_factory(
            production_order=order,
            alcohol_content=Decimal("13.50"),
            ph=Decimal("3.40"),
            analysis_date=date.today(),
        )

        assert analysis.id is not None
        # Acceso al vino mediante la propiedad @property que definimos
        assert analysis.wine.name == wine_glass_dop.name
        assert analysis.production_order == order
        assert analysis.alcohol_content == Decimal("13.50")

        # Verificar que el __str__ usa el nombre del vino correctamente
        assert str(analysis) == f"Análisis {wine_glass_dop.name} - {date.today()}"

    def test_boundary_values_min(
        self, analysis_factory, production_order_factory, wine_glass_dop
    ):
        """Prueba los valores mínimos permitidos en el save()."""
        order = production_order_factory(wine=wine_glass_dop)
        analysis = analysis_factory(
            production_order=order,
            alcohol_content=Decimal("0.00"),
            ph=Decimal("2.50"),
            volatile_acidity=Decimal("0.00"),
        )
        # El save() ya se ejecutó en la factory, si llega aquí es que es válido
        assert analysis.alcohol_content == Decimal("0.00")

    def test_boundary_values_max(
        self, analysis_factory, production_order_factory, wine_glass_dop
    ):
        order = production_order_factory(wine=wine_glass_dop)
        """Prueba los valores máximos permitidos en el save()."""
        analysis = analysis_factory(
            production_order=order,
            alcohol_content=Decimal("22.00"),
            ph=Decimal("4.50"),
            reducing_sugars=Decimal("300.00"),
        )
        assert analysis.alcohol_content == Decimal("22.00")

    def test_alcohol_out_of_range_high(self, analysis_factory):
        """Verifica que el save() bloquea alcohol superior a 22."""
        analysis = analysis_factory.build(alcohol_content=Decimal("22.01"))
        with pytest.raises(ValidationError) as excinfo:
            analysis.save()
        assert "alcohol_content" in excinfo.value.message_dict

    def test_ph_out_of_range_low(self, analysis_factory):
        """Verifica que el save() bloquea pH inferior a 2.50."""
        analysis = analysis_factory.build(ph=Decimal("2.49"))
        with pytest.raises(ValidationError) as excinfo:
            analysis.save()
        assert "ph" in excinfo.value.message_dict

    def test_negative_values_not_allowed(self, analysis_factory):
        """Verifica que parámetros como el IC no pueden ser negativos."""
        analysis = analysis_factory.build(IC=Decimal("-1.00"))
        with pytest.raises(ValidationError):
            analysis.save()

    def test_null_production_order_protection(self, analysis_factory):
        """Verifica que no se puede crear un análisis sin una orden de producción."""
        # Al ser una FK obligatoria, esto disparará un error de integridad o de validación
        with pytest.raises((IntegrityError, ValidationError, ValueError)):
            analysis_factory(production_order=None)
