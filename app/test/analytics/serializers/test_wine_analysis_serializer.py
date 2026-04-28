import pytest

from analytics.serializers import WineAnalysisSerializer

# Cargamos las fixtures necesarias de producción
pytest_plugins = ["test.production_record.conftest"]


@pytest.mark.django_db
class TestWineAnalysisSerializer:

    # --- HAPPY PATH ---
    def test_serializer_with_valid_data(self, production_order_factory):
        """Verifica que el serializer procesa datos correctos vinculados a una orden."""
        order = production_order_factory()  # Crea orden, vino y usuario automáticamente

        payload = {
            "production_order": order.id,  # Nuevo campo obligatorio
            "analysis_date": "2026-04-16",
            "alcohol_content": "13.50",
            "ph": "3.45",
            "volatile_acidity": "0.40",
            "total_acidity": "5.50",
            "reducing_sugars": "1.50",
            "malic_acid": "0.10",
            "lactic_acid": "1.20",
            "IC": "12.00",
            "folin_index": "60.00",
            "gluconic_acid": "0.20",
            "laboratory": "  lab central  ",  # Espacios para testear el strip()
        }

        serializer = WineAnalysisSerializer(data=payload)
        assert serializer.is_valid(), serializer.errors

        # Comprobar limpieza personalizada del validate()
        assert serializer.validated_data["laboratory"] == "LAB CENTRAL"

        # Comprobar acceso a campos de solo lectura (wine_name)
        # Para esto necesitamos que el serializer esté "save-ado" o usar el objeto
        serializer.save()
        assert serializer.data["wine_name"] == order.wine.name

    # --- EDGE CASES (Límites) ---
    def test_serializer_boundary_values(self, production_order_factory):
        """Acepta los límites exactos definidos en el modelo a través de la orden."""
        order = production_order_factory()
        payload = {
            "production_order": order.id,
            "analysis_date": "2026-04-16",
            "alcohol_content": "22.00",
            "ph": "2.50",
            "volatile_acidity": "2.00",
            "total_acidity": "1.00",
            "reducing_sugars": "0.00",
            "malic_acid": "0.00",
            "lactic_acid": "0.00",
            "IC": "0.00",
            "folin_index": "0.00",
            "gluconic_acid": "0.00",
        }
        serializer = WineAnalysisSerializer(data=payload)
        assert serializer.is_valid()

    # --- VALIDATIONS (Errores) ---
    def test_serializer_invalid_alcohol_format(self, production_order_factory):
        """Bloquea valores no numéricos."""
        order = production_order_factory()
        payload = {
            "production_order": order.id,
            "alcohol_content": "NO ES NUMERO",
        }
        serializer = WineAnalysisSerializer(data=payload)
        assert not serializer.is_valid()
        assert "alcohol_content" in serializer.errors

    def test_serializer_invalid_range_low(self, production_order_factory):
        """Respeta los MinValueValidator (pH < 2.50)."""
        order = production_order_factory()
        payload = {
            "production_order": order.id,
            "ph": "2.40",
        }
        serializer = WineAnalysisSerializer(data=payload)
        assert not serializer.is_valid()
        assert "ph" in serializer.errors

    def test_serializer_missing_required_fields(self):
        """Verifica que la orden de producción y la fecha son obligatorias."""
        serializer = WineAnalysisSerializer(data={})
        assert not serializer.is_valid()
        # Ya no buscamos 'wine', sino 'production_order'
        assert "production_order" in serializer.errors
        assert "analysis_date" in serializer.errors
