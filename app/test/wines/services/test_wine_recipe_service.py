from test.inventory.factories import (LabelMaterialFactory,
                                      PackagingMaterialFactory)
from test.wines.factories import WineFactory

import pytest

from wines.services import WineRecipeService


@pytest.mark.django_db
class TestWineRecipeService:

    # --- HAPPY PATHS ---

    def test_recipe_complete_vidrio(self):
        """Un vino en vidrio con todo su kit debe devolver lista vacía."""
        vidrio = PackagingMaterialFactory(packaging_type="VIDRIO")
        cork = PackagingMaterialFactory(packaging_type="CIERRE")
        front = LabelMaterialFactory(label_type="FRONTAL", vintage=2024)
        back = LabelMaterialFactory(label_type="CONTRA", vintage=2024)

        wine = WineFactory(
            default_container=vidrio,
            default_cork=cork,
            default_front_label=front,
            default_back_label=back,
        )

        deficiencies = WineRecipeService.get_recipe_deficiencies(wine)
        assert deficiencies == []

    def test_recipe_complete_bib(self):
        """Un BIB solo necesita el envase para estar completo."""
        bib = PackagingMaterialFactory(packaging_type="BIB")
        # No le ponemos ni corcho ni etiquetas
        wine = WineFactory(default_container=bib, default_cork=None)

        deficiencies = WineRecipeService.get_recipe_deficiencies(wine)
        assert deficiencies == []

    # --- VALIDACIONES (Faltantes) ---

    def test_missing_elements_vidrio(self):
        """Debe detectar múltiples faltantes en vidrio."""
        vidrio = PackagingMaterialFactory.build(packaging_type="VIDRIO")
        wine = WineFactory.build(
            default_container=vidrio,
            default_cork=None,
            default_front_label=None,
            default_back_label=None,
        )

        deficiencies = WineRecipeService.get_recipe_deficiencies(wine)
        assert "Cierre (Corcho/Rosca)" in deficiencies
        assert "Etiqueta Frontal" in deficiencies
        assert "Contraetiqueta" in deficiencies

    def test_missing_elements_garrafa(self):
        """En garrafa (PLASTICO) solo debe pedir tapón y frontal."""
        plastico = PackagingMaterialFactory(packaging_type="PLASTICO")
        wine = WineFactory(
            default_container=plastico,
            default_cork=None,
            default_front_label=None,
            default_back_label=None,  # La contra NO es obligatoria en garrafa según nuestra regla
        )

        deficiencies = WineRecipeService.get_recipe_deficiencies(wine)
        assert "Tapón" in deficiencies
        assert "Etiqueta Frontal" in deficiencies
        assert "Contraetiqueta" not in deficiencies

    # --- EDGE CASES ---

    def test_no_container_at_all(self):
        """Caso límite: El vino no tiene ni siquiera envase."""
        wine = WineFactory.build(default_container=None)
        deficiencies = WineRecipeService.get_recipe_deficiencies(wine)
        assert deficiencies == ["Envase"]

    def test_unknown_container_type(self):
        """
        Si aparece un tipo de envase no contemplado (ej. 'OTRO'),
        no debería romper, simplemente devolver lista vacía o lógica por defecto.
        """
        otro = PackagingMaterialFactory.build(packaging_type="OTRO")
        wine = WineFactory.build(default_container=otro)
        deficiencies = WineRecipeService.get_recipe_deficiencies(wine)
        assert (
            deficiencies == []
        )  # Según nuestra lógica actual, si no es Vidrio/Plástico, no pide nada extra
