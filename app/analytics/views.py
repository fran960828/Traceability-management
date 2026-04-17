from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

from utils.permissions import RolePermission

from .models import WineAnalysis
from .serializers import WineAnalysisSerializer


@extend_schema_view(
    list=extend_schema(
        summary="Listar análisis con filtros",
        description="Obtiene el historial analítico. Permite buscar por nombre de vino y filtrar por rangos de fecha.",
        tags=["Calidad Enológica"],
        parameters=[
            OpenApiParameter(
                name="start_date",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Fecha de inicio del rango (YYYY-MM-DD).",
            ),
            OpenApiParameter(
                name="end_date",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Fecha de fin del rango (YYYY-MM-DD).",
            ),
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Buscar por el nombre del vino analizado.",
            ),
        ],
    ),
    create=extend_schema(
        summary="Registrar nuevo análisis",
        description="Guarda los parámetros químicos de un vino. Valida rangos técnicos automáticamente.",
        tags=["Calidad Enológica"],
    ),
    retrieve=extend_schema(
        summary="Detalle de análisis",
        description="Muestra todos los parámetros (pH, Grado, Acidez, etc.) de una muestra específica.",
        tags=["Calidad Enológica"],
    ),
    update=extend_schema(summary="Actualizar análisis", tags=["Calidad Enológica"]),
    partial_update=extend_schema(
        summary="Actualizar análisis parcial", tags=["Calidad Enológica"]
    ),
    destroy=extend_schema(summary="Eliminar análisis", tags=["Calidad Enológica"]),
)
class WineAnalysisViewSet(viewsets.ModelViewSet):
    # CORRECCIÓN: Usamos 'production_order__wine' para traer todo en una consulta
    queryset = WineAnalysis.objects.all().select_related("production_order__wine")
    serializer_class = WineAnalysisSerializer
    permission_classes = [IsAuthenticated, RolePermission]

    filter_backends = [filters.SearchFilter]
    # CORRECCIÓN: La búsqueda ahora es a través de la relación de la orden
    search_fields = ["production_order__wine__name", "laboratory"]

    def get_queryset(self):
        # CORRECCIÓN: Aquí también actualizamos el select_related
        queryset = WineAnalysis.objects.all().select_related("production_order__wine")

        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if start_date:
            queryset = queryset.filter(analysis_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(analysis_date__lte=end_date)

        return queryset
