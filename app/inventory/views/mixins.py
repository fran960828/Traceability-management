from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response


class InventoryAlertMixin:
    """
    Mixin para añadir la capacidad de consultar materiales bajo mínimos.
    Se adapta automáticamente al tag y serializer del ViewSet que lo use.
    """

    @action(detail=False, methods=["get"], url_path="alerts")
    def alerts(self, request):
        try:
            # 1. Filtramos materiales con min_stock_level > 0 usando el queryset base
            # Esto respeta cualquier filtrado previo de get_queryset()
            queryset = self.get_queryset().filter(min_stock_level__gt=0)

            # 2. Filtramos por la property calculada
            low_stock_items = [obj for obj in queryset if obj.is_low_stock]

            # 3. Serializamos con el serializer_class definido en el ViewSet
            serializer = self.get_serializer(low_stock_items, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"detail": f"Error al procesar alertas: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
