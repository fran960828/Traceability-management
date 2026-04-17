from django.core.exceptions import ValidationError as DjangoValidationError
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from utils.mixins import CloneMixin
from utils.permissions import PurchaseRolePermission  # Reutilizamos según tu indicación

from .models import ProductionOrder
from .serializers import ProductionOrderSerializer


@extend_schema_view(
    list=extend_schema(
        summary="Listar partes de producción",
        description="Consulta los partes de embotellado con filtros por vino, estado y fechas.",
        tags=["Producción y Embotellado"],
        parameters=[
            OpenApiParameter(
                name="wine", type=int, description="Filtrar por ID del vino"
            ),
            OpenApiParameter(
                name="status", type=str, description="DRAFT, CONFIRMED, CANCELLED"
            ),
            OpenApiParameter(
                name="date_from", type=str, description="Fecha inicio (YYYY-MM-DD)"
            ),
            OpenApiParameter(
                name="date_to", type=str, description="Fecha fin (YYYY-MM-DD)"
            ),
        ],
    ),
    create=extend_schema(
        summary="Crear parte de producción (Borrador)",
        tags=["Producción y Embotellado"],
    ),
    retrieve=extend_schema(
        summary="Detalle de parte de producción", tags=["Producción y Embotellado"]
    ),
    update=extend_schema(
        summary="Actualizar parte (Solo si es Borrador)",
        tags=["Producción y Embotellado"],
    ),
    partial_update=extend_schema(
        summary="Actualizar parte de forma parcial (Solo si es Borrador)",
        tags=["Producción y Embotellado"],
    ),
    destroy=extend_schema(
        summary="Eliminar parte (Solo si es Borrador)",
        tags=["Producción y Embotellado"],
    ),
    clone_prefill=extend_schema(
        summary="Preparar datos para clonar orden",
        description=(
            "Recupera los datos de una orden anterior para generar una nueva. "
            "Limpia números de orden, fechas de entrega, lote y resetea el estado a DRAFT."
        ),
        tags=["Producción y Embotellado"],
        responses={200: ProductionOrderSerializer},
    ),
)
class ProductionOrderViewSet(CloneMixin, viewsets.ModelViewSet):
    """
    ViewSet para gestionar el ciclo de vida de un parte de embotellado.
    La confirmación del parte dispara el descuento de stock mediante FIFO.
    """

    queryset = (
        ProductionOrder.objects.select_related("wine", "user")
        .prefetch_related("enological_materials__material")
        .all()
    )
    serializer_class = ProductionOrderSerializer
    permission_classes = [IsAuthenticated, PurchaseRolePermission]
    filter_backends = [filters.SearchFilter]
    search_fields = ["lot_number", "wine__name", "notes"]

    clone_reset_fields = ["id", "lot_number", "status", "created_at", "updated_at"]

    def prepare_clone_data(self, data, instance):
        """
        Lógica de clonación proporcional para embotellados múltiples.
        """
        # 1. Identificamos el volumen original
        original_volume = instance.total_liters

        # 2. Reseteamos datos de cabecera
        data["status"] = "DRAFT"
        data["lot_number"] = ""
        data["production_date"] = None

        if "enological_materials" in data:
            for item in data["enological_materials"]:
                item.pop("id", None)
                item.pop("production_order", None)

                # Opcional: Podríamos recalcular aquí si pasamos un query param
                # con el 'target_quantity'. Si no, el frontend lo hará al cambiar el input.

        return data

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtros por Query Params
        wine_id = self.request.query_params.get("wine")
        status_filter = self.request.query_params.get("status")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if wine_id:
            queryset = queryset.filter(wine_id=wine_id, wine__is_active=True)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if date_from:
            queryset = queryset.filter(production_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(production_date__lte=date_to)

        return queryset

    def perform_create(self, serializer):
        """Inyecta el usuario actual como responsable del parte."""
        serializer.save(user=self.request.user)

    @extend_schema(
        summary="Confirmar Producción",
        description="Ejecuta el descuento de stock (materiales y enológicos) y cierra el parte.",
        responses={200: ProductionOrderSerializer},
        tags=["Producción y Embotellado"],
    )
    @action(detail=True, methods=["post"], url_path="confirm")
    def confirm(self, request, pk=None):
        """
        Acción especial para transicionar de DRAFT a CONFIRMED.
        Llama a la lógica de negocio del modelo (confirm_production).
        """
        production_order = self.get_object()

        try:
            # La lógica de descuento de stock vive en el modelo para asegurar integridad
            production_order.confirm_production()

            # Devolvemos el objeto actualizado con el nuevo estado
            serializer = self.get_serializer(production_order)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except DjangoValidationError as e:
            return Response(
                {"detail": str(e.message if hasattr(e, "message") else e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            # Captura errores críticos (ej: falta de stock en FIFOService)
            return Response(
                {"detail": f"Error en la confirmación: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @extend_schema(
        summary="Cancelar parte de producción", tags=["Producción y Embotellado"]
    )
    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        """Cancela un borrador antes de que se procese el stock."""
        order = self.get_object()
        if order.status != ProductionOrder.Status.DRAFT:
            return Response(
                {"detail": "Solo se pueden cancelar órdenes en borrador."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = ProductionOrder.Status.CANCELLED
        order.save()
        return Response({"detail": "Orden cancelada."}, status=status.HTTP_200_OK)
