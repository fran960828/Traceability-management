from drf_spectacular.utils import (OpenApiParameter, OpenApiResponse,
                                   extend_schema, extend_schema_view)
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

from utils.permissions import RolePermission
from wines.models import WineModel
from wines.serializers import WineSerializer


@extend_schema_view(
    list=extend_schema(
        summary="Listar vinos con filtros",
        description="Obtiene el catálogo de vinos. Permite buscar por nombre y filtrar por añada o tipo de vino.",
        tags=["Gestión de Vinos"],
        parameters=[
            OpenApiParameter(
                name="vintage",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Filtrar por año de cosecha (Añada).",
            ),
            OpenApiParameter(
                name="wine_type",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filtrar por tipo (TINTO, BLANCO, ROSADO, etc.).",
            ),
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Término de búsqueda para el nombre del vino.",
            ),
        ],
    ),
    create=extend_schema(
        summary="Registrar nuevo vino",
        description="Crea un vino en el sistema. Valida integridad de materiales y genera código WN- automático.",
        tags=["Gestión de Vinos"],
        responses={
            201: WineSerializer,
            400: OpenApiResponse(
                description="Error de validación (ej. Mismatch de añada en etiquetas)"
            ),
        },
    ),
    retrieve=extend_schema(
        summary="Detalle de vino",
        description="Muestra toda la información técnica del vino.",
        tags=["Gestión de Vinos"],
    ),
    update=extend_schema(
        summary="Actualizar vino (Completo)", tags=["Gestión de Vinos"]
    ),
    partial_update=extend_schema(
        summary="Actualizar vino (Parcial)", tags=["Gestión de Vinos"]
    ),
    destroy=extend_schema(
        summary="Eliminar vino",
        description="**Acción crítica:** Solo usuarios autorizados pueden eliminar fichas de vino.",
        tags=["Gestión de Vinos"],
        responses={
            204: OpenApiResponse(description="Eliminado correctamente"),
            403: OpenApiResponse(description="No autorizado"),
        },
    ),
)
class WineViewSet(viewsets.ModelViewSet):
    """
    CRUD completo para la gestión de Vinos (Fichas Técnicas)
    """

    queryset = WineModel.objects.all().order_by("-vintage", "name")
    serializer_class = WineSerializer
    permission_classes = [IsAuthenticated, RolePermission]

    # Motor de búsqueda nativo para el nombre del vino
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "appellation_name", "internal_code"]

    def get_queryset(self):
        """
        Lógica de filtrado dinámico para los Selects del Frontend
        """
        queryset = WineModel.objects.all().order_by("-vintage", "name")

        vintage = self.request.query_params.get("vintage")
        wine_type = self.request.query_params.get("wine_type")

        if vintage:
            queryset = queryset.filter(vintage=vintage)

        if wine_type:
            # Lo filtramos en mayúsculas para asegurar coincidencia con CHOICES
            queryset = queryset.filter(wine_type=wine_type.upper())

        return queryset
