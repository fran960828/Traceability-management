import pytest


@pytest.mark.django_db
class TestEnologicalMaterialModel:

    def test_enological_sanitization(self, enological_factory):
        """Prueba que el formato comercial también se limpie"""
        material = enological_factory(
            name="acido tartárico", commercial_format="  saco 25 kg  "
        )
        assert material.name == "ACIDO TARTÁRICO"
        assert material.commercial_format == "SACO 25 KG"

    def test_prefix_is_correct(self, enological_factory):
        """Asegura que el prefijo sea ENO y no otro"""
        material = enological_factory()
        assert material.internal_code.startswith("ENO-")

    def test_empty_commercial_format(self, enological_factory):
        """Edge Case: El formato comercial puede ser opcional (blank=True)"""
        material = enological_factory(commercial_format="")
        assert material.commercial_format == ""
