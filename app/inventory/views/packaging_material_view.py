from drf_spectacular.utils import (
    extend_schema,
    extend_schema_view,
    OpenApiParameter,
    OpenApiResponse,
)
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated

from utils.permissions import RolePermission
from ..models.packaging_material_model import PackagingMaterialModel
from ..serializers.packaging_material_serializer import PackagingMaterialSerializer


@extend_schema_view(
    list=extend_schema(
        summary="Listar materiales de acondicionamiento",
        description="Obtiene materiales de packaging. Permite buscar por nombre/código y filtrar por tipo (VIDRIO, CIERRE, etc).",
        tags=["Inventario - Packaging"],
        parameters=[
            OpenApiParameter(
                name="packaging_type",
                type=str,
                description="Filtrar por tipo de material (ej: VIDRIO, CIERRE)",
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
        summary="Crear material de packaging",
        tags=["Inventario - Packaging"],
        responses={
            201: PackagingMaterialSerializer,
            400: OpenApiResponse(description="Datos inválidos"),
        },
    ),
    retrieve=extend_schema(
        summary="Detalle de material", tags=["Inventario - Packaging"]
    ),
    update=extend_schema(
        summary="Actualizar material (Put)", tags=["Inventario - Packaging"]
    ),
    partial_update=extend_schema(
        summary="Actualizar material (Patch)", tags=["Inventario - Packaging"]
    ),
    destroy=extend_schema(
        summary="Eliminar material",
        tags=["Inventario - Packaging"],
        responses={
            204: OpenApiResponse(description="Eliminado correctamente"),
            403: OpenApiResponse(description="No autorizado"),
        },
    ),
)
class PackagingMaterialViewSet(viewsets.ModelViewSet):
    queryset = PackagingMaterialModel.objects.all().order_by("-created_at")
    serializer_class = PackagingMaterialSerializer
    permission_classes = [IsAuthenticated,RolePermission]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "internal_code"]

    def get_queryset(self):
        queryset = super().get_queryset()
        p_type = self.request.query_params.get("packaging_type")
        if p_type:
            queryset = queryset.filter(packaging_type=p_type)
        return queryset
