from drf_spectacular.utils import (OpenApiParameter, extend_schema,
                                   extend_schema_view)
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

from purchase.models import PurchaseOrderItem
from purchase.serializers import PurchaseOrderItemSerializer
from utils.permissions import PurchaseRolePermission


@extend_schema_view(
    list=extend_schema(
        summary="Listar líneas de pedido individuales",
        description="Permite consultar ítems de forma aislada. Útil para reportes de materiales específicos.",
        tags=["Gestión de Compras - Líneas"],
        parameters=[
            OpenApiParameter(
                name="purchase_order",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Filtrar ítems de una orden específica.",
            ),
            OpenApiParameter(
                name="material_type",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filtrar por tipo: packaging, label, enological.",
            ),
        ],
    ),
    retrieve=extend_schema(
        summary="Detalle de una línea de pedido",
        tags=["Gestión de Compras - Líneas"],
    ),
    create=extend_schema(
        summary="Crear línea de pedido",
        description="Crear una linea de compra",
        tags=["Gestión de Compras - Líneas"],
    ),
    update=extend_schema(
        summary="Actualizar línea de pedido (Put)",
        description="Modifica cantidad o precio de una línea. Bloqueado si la orden padre está cerrada.",
        tags=["Gestión de Compras - Líneas"],
    ),
    partial_update=extend_schema(
        summary="Actualizar línea de pedido (Patch)",
        description="Modifica cantidad o precio de una línea. Bloqueado si la orden padre está cerrada.",
        tags=["Gestión de Compras - Líneas"],
    ),
    destroy=extend_schema(
        summary="Eliminar línea de pedido",
        description="Borra un producto de la orden. No permitido si la orden está cerrada.",
        tags=["Gestión de Compras - Líneas"],
    ),
)
class PurchaseOrderItemViewSet(viewsets.ModelViewSet):
    """
    Controlador para la gestión individual de las líneas de productos.
    """

    queryset = PurchaseOrderItem.objects.all()
    serializer_class = PurchaseOrderItemSerializer
    permission_classes = [IsAuthenticated, PurchaseRolePermission]

    # Permitimos buscar por el nombre del material (usando los nombres de los modelos relacionados)
    filter_backends = [filters.SearchFilter]
    search_fields = ["packaging__name", "label__name", "enological__name"]

    def get_queryset(self):
        """
        Optimización de consultas para evitar el N+1 al traer los nombres de los materiales.
        """
        queryset = PurchaseOrderItem.objects.select_related(
            "purchase_order", "packaging", "label", "enological"
        ).all()

        po_id = self.request.query_params.get("purchase_order")
        material_type = self.request.query_params.get("material_type")

        if po_id:
            queryset = queryset.filter(purchase_order_id=po_id)

        if material_type:
            # Filtro dinámico: solo devolvemos los que tienen ese campo relleno
            if material_type == "packaging":
                queryset = queryset.exclude(packaging__isnull=True)
            elif material_type == "label":
                queryset = queryset.exclude(label__isnull=True)
            elif material_type == "enological":
                queryset = queryset.exclude(enological__isnull=True)

        return queryset

    def perform_destroy(self, instance):
        """
        Aseguramos que el ValidationError del modelo al borrar
        se lance correctamente durante la petición DELETE.
        """
        instance.delete()
