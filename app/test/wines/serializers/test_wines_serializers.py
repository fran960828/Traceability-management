import pytest
from rest_framework.exceptions import ValidationError as DRFValidationError

from wines.serializers import WineSerializer


@pytest.mark.django_db
class TestWineSerializer:

    # ==========================================================================
    # 1. TEST DE REPRESENTACIÓN (GET)
    # ==========================================================================

    def test_serializer_output_data(self, wine_glass_dop):
        """Verifica que el JSON de salida incluye los nombres de los materiales"""
        serializer = WineSerializer(instance=wine_glass_dop)
        data = serializer.data

        # Comprobamos que viajan IDs para el sistema
        assert data["default_container"] == wine_glass_dop.default_container.id

        # Comprobamos que viajan NOMBRES para el humano/frontend
        assert data["container_name"] == wine_glass_dop.default_container.name
        assert data["cork_name"] == wine_glass_dop.default_cork.name
        assert data["appellation_type_display"] == "DENOMINACIÓN DE ORIGEN PROTEGIDA"
        assert "internal_code" in data

    # ==========================================================================
    # 2. VALIDACIÓN DE TIPOS DE MATERIAL (POST/PUT)
    # ==========================================================================

    def test_validate_wrong_material_type_for_container(self, packaging_factory):
        """Error: Intentar asignar un TAPÓN al campo de ENVASE"""
        # 1. Creamos el tapón (tipo CIERRE)
        tapon = packaging_factory(packaging_type="CIERRE", name="TAPÓN DE PRUEBA")

        # 2. Preparamos los datos mínimos para que el Serializer sea válido excepto el contenedor
        data = {
            "name": "VINO TEST",
            "vintage": 2024,
            "appellation_type": "DOP",
            "appellation_name": "RIOJA",
            "wine_type": "TINTO",
            "aging_category": "CRIANZA",
            "alcohol_percentage": 14.0,
            "varietals": "100% TEMPRANILLO",
            "default_container": tapon.id,  # <-- Enviamos el ID del tapón
        }

        serializer = WineSerializer(data=data)

        is_valid = serializer.is_valid()

        assert not is_valid
        assert "default_container" in serializer.errors

    def test_validate_wrong_label_type_for_seal(self, label_factory, packaging_factory):
        """Error: Intentar asignar una etiqueta FRONTAL al campo de TIRILLA"""
        container = packaging_factory(packaging_type="VIDRIO")
        frontal = label_factory(label_type="FRONTAL", name="ETIQUETA EQUIVOCADA")

        data = {
            "name": "VINO TEST",
            "vintage": 2024,
            "appellation_type": "DOP",
            "default_container": container.id,
            "default_dop_seal": frontal.id,  # <-- ERROR: No es una Tirilla
        }

        serializer = WineSerializer(data=data)
        assert not serializer.is_valid()
        assert "default_dop_seal" in serializer.errors

    # ==========================================================================
    # 3. INTEGRIDAD Y SOLO LECTURA
    # ==========================================================================

    def test_internal_code_is_readonly(self, wine_glass_dop):
        """Verifica que el internal_code no se puede cambiar vía API"""
        old_code = wine_glass_dop.internal_code
        data = {
            "internal_code": "HACK-001",  # Intento de hackeo
            "name": "NOMBRE NUEVO",
        }

        # Partial=True para simular un PATCH
        serializer = WineSerializer(instance=wine_glass_dop, data=data, partial=True)
        assert serializer.is_valid()
        serializer.save()

        wine_glass_dop.refresh_from_db()
        assert wine_glass_dop.internal_code == old_code  # El código NO cambió
        assert wine_glass_dop.name == "NOMBRE NUEVO"

    # ==========================================================================
    # 4. PROPAGACIÓN DE ERRORES DEL MODELO (Añada Mismatch)
    # ==========================================================================

    def test_serializer_catches_model_vintage_error(
        self, label_factory, packaging_factory
    ):
        """Verifica que el Serializer rebota el error de añada del Modelo"""
        container = packaging_factory(packaging_type="VIDRIO")
        etiqueta_2020 = label_factory(vintage=2020, label_type="FRONTAL")
        cork = packaging_factory(packaging_type="CIERRE")

        data = {
            "name": "VINO 2024",
            "vintage": 2024,
            "appellation_type": "MESA",
            "appellation_name": "ESPAÑA",
            "wine_type": "TINTO",
            "aging_category": "JOVEN",
            "varietals": "TEST",
            "alcohol_percentage": 13.0,
            "default_container": container.id,
            "default_front_label": etiqueta_2020.id,  # <-- ERROR DE AÑADA (2020 vs 2024)
            "default_cork": cork.id,
        }

        serializer = WineSerializer(data=data)
        # is_valid() pasará porque el Serializer no mira las añadas...
        assert serializer.is_valid()

        # ...pero al hacer save(), el modelo lanza ValidationError y el Serializer lo captura
        with pytest.raises(DRFValidationError) as exc:
            serializer.save()

        assert "default_front_label" in exc.value.detail
