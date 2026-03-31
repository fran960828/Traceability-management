import pytest
from django.core.exceptions import ValidationError


@pytest.mark.django_db
class TestWineModel:

    # ==========================================================================
    # 1. HAPPY PATHS (Los 3 Escenarios Maestros)
    # ==========================================================================

    def test_create_glass_bottle_dop_success(self, wine_glass_dop):
        """Verifica que una botella estándar con DOP y Tirilla es válida"""
        wine_glass_dop.full_clean()  # Ejecuta todas las validaciones (clean, validators, etc.)
        assert wine_glass_dop.internal_code.startswith("WN-")
        assert wine_glass_dop.default_cork is not None

    def test_create_bib_mesa_success(self, wine_bib_mesa):
        """Verifica que un BIB de mesa es válido sin corcho ni tirilla"""
        wine_bib_mesa.full_clean()
        assert wine_bib_mesa.default_cork is None
        assert wine_bib_mesa.default_dop_seal is None

    def test_create_garrafa_igp_success(self, wine_garrafa_plastico):
        """Verifica que una garrafa con tapón y sin tirilla (IGP) es válida"""
        wine_garrafa_plastico.full_clean()
        assert wine_garrafa_plastico.default_container.packaging_type == "PLASTICO"

    # ==========================================================================
    # 2. VALIDACIONES LEGALES Y DE NEGOCIO (Edge Cases)
    # ==========================================================================

    def test_error_dop_without_seal(self, wine_factory):
        """Error: Un vino DOP/DOCa no puede existir sin su Tirilla/Precinto"""

        wine = wine_factory.build(appellation_type="DOP", default_dop_seal=None)
        with pytest.raises(ValidationError) as exc:
            wine.save()
        assert "default_dop_seal" in exc.value.message_dict

    def test_error_glass_bottle_without_cork(self, wine_factory, packaging_factory):
        """Error: Si el envase es VIDRIO, el cierre es obligatorio"""
        wine = wine_factory.build(default_cork=None)
        with pytest.raises(ValidationError) as exc:
            wine.save()
        assert "default_cork" in exc.value.message_dict

    def test_error_vintage_mismatch_labels(
        self, wine_factory, label_factory, packaging_factory
    ):
        """Error: La añada de la etiqueta debe coincidir con la del vino (Trazabilidad)"""
        etiqueta_2020 = label_factory(vintage=2020, label_type="FRONTAL")
        wine = wine_factory.build(
            vintage=2024,
            default_front_label=etiqueta_2020,
        )
        with pytest.raises(ValidationError) as exc:
            wine.save()
        assert "default_front_label" in exc.value.message_dict

    # ==========================================================================
    # 3. INTEGRIDAD DE DATOS (Sanitización y Códigos)
    # ==========================================================================

    def test_name_sanitization(self, wine_factory):
        """Verifica que el nombre se guarda en MAYÚSCULAS y sin espacios extra"""
        wine = wine_factory(name="   Chardonnay Barrica   ")
        assert wine.name == "CHARDONNAY BARRICA"

    def test_unique_name_vintage_constraint(self, wine_factory):
        """Error: No pueden existir dos registros de la misma Marca y Añada"""
        wine_factory(name="RESERVA", vintage=2022)
        with pytest.raises(Exception):  # Django lanzará IntegrityError a nivel DB
            wine_factory(name="RESERVA", vintage=2022)

    def test_internal_code_sequence_by_vintage(self, wine_factory):
        """Verifica que el contador de código (001, 002) es independiente por año"""
        w1 = wine_factory(vintage=2022)  # BRD-2022-001
        w2 = wine_factory(vintage=2022)  # BRD-2022-002
        w3 = wine_factory(vintage=2025)  # BRD-2025-001 (Reinicia contador)

        assert w1.internal_code == "WN-2022-001"
        assert w2.internal_code == "WN-2022-002"
        assert w3.internal_code == "WN-2025-001"

    # ==========================================================================
    # 4. SEGURIDAD DE ELIMINACIÓN (SET_NULL)
    # ==========================================================================

    def test_material_deletion_does_not_delete_wine(self, wine_glass_dop):
        """Verifica que si borras un Corcho, el Vino sigue existiendo con cork=None"""
        cork = wine_glass_dop.default_cork
        cork.delete()

        wine_glass_dop.refresh_from_db()
        assert wine_glass_dop is not None
        assert wine_glass_dop.default_cork is None
