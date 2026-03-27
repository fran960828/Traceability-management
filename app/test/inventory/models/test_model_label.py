import pytest
from django.core.exceptions import ValidationError
from inventory.models.label_material_model import LabelMaterialModel

@pytest.mark.django_db
class TestLabelMaterialModel:

    def test_label_vintage_validation(self, label_factory):
        """Edge Case: Validar rango de añada (validators en el modelo)"""
        # El modelo tiene MaxValueValidator(2100) y MinValueValidator(1900)
        label = label_factory(vintage=1800)
        with pytest.raises(ValidationError):
            label.full_clean() # full_clean dispara los validadores de campo

    def test_label_brand_sanitization(self, label_factory):
        """Prueba la limpieza de la marca de la bodega"""
        label = label_factory(brand_reference="  reserva familiar  ")
        assert label.brand_reference == "RESERVA FAMILIAR"

   