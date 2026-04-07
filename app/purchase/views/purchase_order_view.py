from drf_spectacular.utils import (OpenApiParameter, OpenApiResponse,
                                   extend_schema, extend_schema_view)
from rest_framework import filters, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from purchase.models import PurchaseOrder
from purchase.serializers import PurchaseOrderSerializer
from utils.permissions import PurchaseRolePermission


@extend_schema_view(
    list=extend_schema(
        summary="Listar órdenes de compra",
        description="Obtiene todas las órdenes de compra. Permite filtrar por estado (DRAFT, OPEN, etc.) y por proveedor.",
        tags=["Gestión de Compras"],
        parameters=[
            OpenApiParameter(
                name="status",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filtrar por estado: DRAFT, OPEN, PARTIAL, CLOSED, CANCELLED.",
            ),
            OpenApiParameter(
                name="supplier",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Filtrar por ID del proveedor.",
            ),
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Buscar por número de orden (PO-2026-XXXX) o nombre del proveedor.",
            ),
        ],
    ),
    create=extend_schema(
        summary="Crear nueva orden de compra",
        description="Registra una orden con sus líneas (items) de forma atómica. Genera el código PO- automático.",
        tags=["Gestión de Compras"],
        responses={
            201: PurchaseOrderSerializer,
            400: OpenApiResponse(
                description="Error de validación (ej. Orden sin items o precio negativo)"
            ),
        },
    ),
    retrieve=extend_schema(
        summary="Detalle de orden de compra",
        description="Muestra la cabecera y todas las líneas de productos asociadas.",
        tags=["Gestión de Compras"],
    ),
    update=extend_schema(
        summary="Actualizar orden (Completo)",
        description="Actualiza cabecera e items. Bloqueado si la orden está CLOSED o CANCELLED.",
        tags=["Gestión de Compras"],
    ),
    partial_update=extend_schema(
        summary="Actualizar orden (Parcial)", tags=["Gestión de Compras"]
    ),
    destroy=extend_schema(
        summary="Eliminar orden de compra",
        description="**Acción crítica:** Solo permitido si la orden no está cerrada.",
        tags=["Gestión de Compras"],
        responses={
            204: OpenApiResponse(description="Eliminado correctamente"),
            400: OpenApiResponse(description="No se puede eliminar una orden cerrada"),
            403: OpenApiResponse(description="No autorizado"),
        },
    ),
)
class PurchaseOrderViewSet(viewsets.ModelViewSet):
    """
    Controlador para el ciclo de vida de las Órdenes de Compra.
    Maneja la creación anidada de items y las restricciones de estado.
    """

    queryset = PurchaseOrder.objects.all().order_by("-date_issued")
    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsAuthenticated, PurchaseRolePermission]

    # Motor de búsqueda para el número de orden y nombre del proveedor
    filter_backends = [filters.SearchFilter]
    search_fields = ["order_number", "supplier__name"]

    def get_queryset(self):
        """
        Optimización de consultas y filtrado dinámico.
        Usamos select_related para el proveedor y prefetch_related para los items
        para evitar el problema de consultas N+1.
        """
        queryset = (
            PurchaseOrder.objects.select_related("supplier")
            .prefetch_related("items")
            .all()
        )

        status_param = self.request.query_params.get("status")
        supplier_param = self.request.query_params.get("supplier")

        if status_param:
            queryset = queryset.filter(status=status_param.upper())

        if supplier_param:
            queryset = queryset.filter(supplier_id=supplier_param)

        return queryset.order_by("-date_issued")

    def destroy(self, request, *args, **kwargs):
        """
        Sobrescribimos para capturar el ValidationError del modelo
        al intentar borrar órdenes cerradas y devolver un 400 limpio.
        """
        try:
            return super().destroy(request, *args, **kwargs)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
