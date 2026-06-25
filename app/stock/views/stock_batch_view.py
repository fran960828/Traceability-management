from django.db import models
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

from utils.permissions import PurchaseRolePermission

from stock.models import Batch
from stock.serializers import BatchSerializer


@extend_schema_view(
    list=extend_schema(
        summary="Listar existencias disponibles por lote",
        description="Consulta los lotes activos con saldo mayor que cero, permitiendo filtrar por zona física o artículo.",
        tags=["Consultas de Inventario"],
        parameters=[
            OpenApiParameter(
                name="location", type=int, description="Filtrar por ID de la ubicación actual real del lote"
            ),
            OpenApiParameter(
                name="supplier", type=int, description="Filtrar por ID del Proveedor de origen"
            ),
            OpenApiParameter(
                name="product_name",
                type=str,
                description="Filtrar por coincidencia en el nombre del insumo/material",
            ),
        ],
    ),
    retrieve=extend_schema(
        summary="Detalle técnico de existencias por lote", 
        tags=["Consultas de Inventario"]
    ),
)
class AvailableStockViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Muelle de lectura optimizado para el panel de 'Existencias y Lotes Disponibles'.
    Filtra y pagina LOTES reales de forma nativa en el servidor (Postgres/SQLite).
    """

    # 🟢 OPTIMIZACIÓN INDUSTRIAL: select_related evita consultas recurrentes (N+1)
    # Solo exponemos aquellos lotes cuyo estado persistente e indexado sea 'AVAILABLE'
    queryset = Batch.objects.select_related(
        "order_item__purchase_order__supplier",
        "order_item__packaging",
        "order_item__enological",
        "order_item__label",
    ).filter(stock_status="AVAILABLE").order_by("-arrival_date")
    
    serializer_class = BatchSerializer
    permission_classes = [IsAuthenticated, PurchaseRolePermission]
    
    # Soporte para la barra de búsqueda global del Frontend
    filter_backends = [filters.SearchFilter]
    search_fields = [
        "batch_number",
        "order_item__packaging__name",
        "order_item__enological__name",
        "order_item__label__name",
    ]

    def get_queryset(self):
        """
        Intercepta los Query Params del frontend para aplicar filtros cruzados
        en caliente antes de computar las páginas de resultados.
        """
        queryset = super().get_queryset()

        # Captura de parámetros analíticos de la URL
        supplier_id = self.request.query_params.get("supplier")
        product_name = self.request.query_params.get("product_name")
        loc_id = self.request.query_params.get("location")

        # A. Filtrado por Proveedor
        if supplier_id:
            queryset = queryset.filter(order_item__purchase_order__supplier_id=supplier_id)

        # B. Filtrado por Nombre de Producto (Búsqueda parcial insensible a mayúsculas)
        if product_name:
            queryset = queryset.filter(
                models.Q(order_item__packaging__name__icontains=product_name)
                | models.Q(order_item__enological__name__icontains=product_name)
                | models.Q(order_item__label__name__icontains=product_name)
            )

        # C. FILTRADO POR UBICACIÓN ACTUAL REAL:
        # Un lote está en una zona si su ÚLTIMO movimiento registrado ocurrió en esa zona.
        if loc_id:
            # Filtramos los lotes asegurándonos de que el ID del movimiento más reciente coincida con loc_id
            queryset = queryset.filter(
                movements__id=models.Subquery(
                    queryset.model.movements.field.model.objects.filter(
                        batch=models.OuterRef("pk")
                    ).order_by("-id").values("id")[:1]
                ),
                movements__location_id=loc_id
            )

        return queryset