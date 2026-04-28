from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from utils.permissions import PurchaseRolePermission

from .models import IndirectCostConfig, ProductionCosting
from .serializers import IndirectCostConfigSerializer
from .serializers import ProductionCostingSerializer

@extend_schema_view(
    list=extend_schema(
        summary="Listar configuraciones de costes",
        description="Obtiene una lista de todas las tasas de costes configuradas.",
        tags=["Costes y Precios"]
    ),
    create=extend_schema(
        summary="Crear nueva configuración de tasas",
        description="Registra un nuevo conjunto de tasas. Si se marca como activa, se desactivarán las demás.",
        tags=["Costes y Precios"]
    ),
    retrieve=extend_schema(
        summary="Detalle de configuración",
        description="Recupera la información específica de una tasa por su ID.",
        tags=["Costes y Precios"]
    ),
    update=extend_schema(
        summary="Actualizar tasas existentes (Completo)",
        description="Sobrescribe todos los campos de una configuración de costes.",
        tags=["Costes y Precios"]
    ),
    partial_update=extend_schema(
        summary="Actualizar tasas de forma parcial",
        description="Permite modificar campos sueltos (ej: solo la tasa de energía) sin enviar el resto.",
        tags=["Costes y Precios"]
    ),
    destroy=extend_schema(
        summary="Eliminar configuración",
        description="Borra permanentemente una configuración del sistema.",
        tags=["Costes y Precios"]
    ),
)
class IndirectCostConfigViewSet(viewsets.ModelViewSet):
    """
    CRUD completo para las tasas de costes indirectos.
    La lógica de activación única se gestiona en el Serializer.
    """
    queryset = IndirectCostConfig.objects.all().order_by('-created_at')
    serializer_class = IndirectCostConfigSerializer
    permission_classes = [IsAuthenticated, PurchaseRolePermission]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

@extend_schema_view(
    list=extend_schema(
        summary="Listar escandallos de producción",
        description="Consulta el desglose de costes de los lotes confirmados.",
        tags=["Costes y Precios"]
    ),
    retrieve=extend_schema(
        summary="Detalle del escandallo",
        description="Recupera el desglose detallado de materiales y costes indirectos.",
        tags=["Costes y Precios"]
    ),
)
class ProductionCostingViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para consulta de costes de producción.
    Solo lectura para garantizar que los datos coincidan con el cálculo del servicio.
    """
    # Optimizamos con select_related para evitar N+1
    queryset = ProductionCosting.objects.select_related(
        "production_order", 
        "production_order__wine"
    ).all().order_by('-created_at')
    
    serializer_class = ProductionCostingSerializer
    permission_classes = [IsAuthenticated, PurchaseRolePermission]
    
    filter_backends = [filters.SearchFilter]
    search_fields = [
        "production_order__lot_number",
        "production_order__wine__name",
    ]

    # Mantenemos el lookup por número de lote como en trazabilidad
    lookup_field = "production_order__lot_number"
    lookup_url_kwarg = "lot_number"

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros adicionales por Query Params
        lot_number = self.request.query_params.get("lot_number")
        wine_id = self.request.query_params.get("wine")

        if lot_number:
            queryset = queryset.filter(production_order__lot_number=lot_number)
        if wine_id:
            queryset = queryset.filter(production_order__wine_id=wine_id)
            
        return queryset