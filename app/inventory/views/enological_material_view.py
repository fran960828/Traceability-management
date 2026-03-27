from drf_spectacular.utils import (
    extend_schema,
    extend_schema_view,
    OpenApiParameter,
    OpenApiResponse,
)
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated

from utils.permissions import RolePermission
from ..models.enological_material_model import EnologicalMaterialModel
from ..serializers.enological_material_serializer import EnologicalMaterialSerializer


@extend_schema_view(
    list=extend_schema(
        summary="Listar productos enológicos",
        description="Obtiene los productos enológicos. Permite buscar por nombre/código y filtrar por tipo (ESTABILIZANTE, CONSERVANTE, etc).",
        tags=["Inventario - Enológicos"],
        parameters=[
            OpenApiParameter(
                name="enological_type",
                type=str,
                description="Filtrar por tipo de producto (ej: ESTABILIZANTE, CONSERVANTE, ACIDIFICANTE)",
            ),
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Término de búsqueda para nombre o internal_code",
            ),
        ],
    ),
    create=extend_schema(
        summary="Crear producto enológico",
        tags=["Inventario - Enológicos"],
        responses={
            201: EnologicalMaterialSerializer,
            400: OpenApiResponse(description="Datos inválidos"),
        },
    ),
    retrieve=extend_schema(
        summary="Detalle de producto enológico", tags=["Inventario - Enológicos"]
    ),
    update=extend_schema(
        summary="Actualizar producto (Put)", tags=["Inventario - Enológicos"]
    ),
    partial_update=extend_schema(
        summary="Actualizar producto (Patch)", tags=["Inventario - Enológicos"]
    ),
    destroy=extend_schema(
        summary="Eliminar producto enológico",
        tags=["Inventario - Enológicos"],
        responses={
            204: OpenApiResponse(description="Eliminado correctamente"),
            403: OpenApiResponse(description="No autorizado"),
        },
    ),
)
class EnologicalMaterialViewSet(viewsets.ModelViewSet):
    queryset = EnologicalMaterialModel.objects.all().order_by("-created_at")
    serializer_class = EnologicalMaterialSerializer
    permission_classes = [IsAuthenticated,RolePermission]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "internal_code"]

    def get_queryset(self):
        queryset = super().get_queryset()
        e_type = self.request.query_params.get("enological_type")
        if e_type:
            queryset = queryset.filter(enological_type=e_type)
        return queryset
