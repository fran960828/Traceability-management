from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from wines.models import WineModel


class WineSerializer(serializers.ModelSerializer):
    # Campos de solo lectura para el GET (Representación amigable)
    container_name = serializers.ReadOnlyField(source="default_container.name")
    cork_name = serializers.ReadOnlyField(source="default_cork.name")
    front_label_name = serializers.ReadOnlyField(source="default_front_label.name")
    dop_seal_name = serializers.ReadOnlyField(source="default_dop_seal.name")

    # Campo calculado para el nombre legible de la denominación (DOP, DOCa...)
    appellation_type_display = serializers.CharField(
        source="get_appellation_type_display", read_only=True
    )

    class Meta:
        model = WineModel
        fields = [
            "id",
            "internal_code",
            "name",
            "vintage",
            "is_active",
            "appellation_type",
            "appellation_type_display",
            "appellation_name",
            "wine_type",
            "aging_category",
            "varietals",
            "alcohol_percentage",
            # Foreign Keys para escritura
            "default_container",
            "default_cork",
            "default_front_label",
            "default_back_label",
            "default_dop_seal",
            # Nombres para lectura
            "container_name",
            "cork_name",
            "front_label_name",
            "dop_seal_name",
        ]
        read_only_fields = ["internal_code"]

    def validate(self, data):
        """
        Validaciones de integridad que el ModelSerializer no hace por defecto
        antes de llegar al save() del modelo.
        """
        # 1. Validar que el material asignado a 'default_cork' sea realmente un CIERRE
        cork = data.get("default_cork")
        if cork and cork.packaging_type != "CIERRE":
            raise serializers.ValidationError(
                {"default_cork": f"El material '{cork.name}' no es de tipo CIERRE."}
            )

        # 2. Validar que la Tirilla sea de tipo 'TIRILLA'
        seal = data.get("default_dop_seal")
        if seal and seal.label_type != "TIRILLA":
            raise serializers.ValidationError(
                {
                    "default_dop_seal": "El material seleccionado debe ser una TIRILLA de la D.O."
                }
            )

        container = data.get("default_container")
        if container and container.packaging_type not in ["VIDRIO", "BIB", "PLASTICO"]:
            raise serializers.ValidationError(
                {
                    "default_container": "El material seleccionado no es un envase válido (Vidrio/BIB/Plástico)."
                }
            )

        front = data.get("default_front_label")
        if front and front.label_type != "FRONTAL":
            raise serializers.ValidationError(
                {"default_front_label": "Debe ser de tipo FRONTAL."}
            )

        back = data.get("default_back_label")
        if back and back.label_type != "CONTRA":
            raise serializers.ValidationError(
                {"default_back_label": "Debe ser de tipo CONTRA."}
            )

        return data

    def create(self, validated_data):
        try:
            # Aquí 'validated_data' ya pasó el filtro del Serializer (tipos de datos y PKs existentes).
            # Llamamos al create del padre, que a su vez disparará el .save() del Modelo.
            return super().create(validated_data)

        except DjangoValidationError as e:
            # Si el modelo Wine detecta un error en su full_clean() (ej: añada de etiqueta != añada vino),
            # lanza un DjangoValidationError. DRF no sabe leer esto por defecto y daría un error 500

            # 'e.message_dict' es el diccionario de errores por campo: {'default_front_label': ['Error...']}
            # Si el error es global y no por campos, usamos 'e.messages' (una lista de textos).
            error_data = getattr(e, "message_dict", e.messages)

            # 4. RESPUESTA LIMPIA AL BROWSER:
            # Convertimos el error de Django en un 'serializers.ValidationError'.
            # Esto le llega al frontend como un 400 Bad Request con un JSON estructurado.
            raise serializers.ValidationError(error_data)
