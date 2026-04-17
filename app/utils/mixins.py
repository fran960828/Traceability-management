# utils/mixins.py
from rest_framework.decorators import action
from rest_framework.response import Response


class CloneMixin:
    """
    Mixin para permitir la clonación de instancias preparando los datos
    para un formulario de creación en el frontend.
    """

    # Lista de campos que NO queremos clonar por defecto (se pueden sobrescribir en el ViewSet)
    fields_to_reset = ["id", "created_at", "updated_at", "internal_code"]

    @action(detail=True, methods=["get"], url_path="clone-prefill")
    def clone_prefill(self, request, pk=None):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data

        # 1. Limpiamos los campos definidos para resetear
        # Buscamos 'clone_reset_fields' en el ViewSet, si no, usamos el por defecto
        reset_list = getattr(self, "clone_reset_fields", self.fields_to_reset)

        for field in reset_list:
            data.pop(field, None)

        # 2. Lógica personalizada por ViewSet (opcional)
        # Si el ViewSet define 'prepare_clone_data', lo ejecutamos
        if hasattr(self, "prepare_clone_data"):
            data = self.prepare_clone_data(data, instance)

        return Response(data)
