from drf_spectacular.utils import (
    extend_schema,
    extend_schema_view,
    OpenApiParameter,
    OpenApiResponse,
)
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated

from utils.permissions import RolePermission
from ..models.label_material_model import LabelMaterialModel
from ..serializers.label_material_serializer import LabelMaterialSerializer


@extend_schema_view(
    list=extend_schema(
        summary="Listar etiquetas y contras",
        description="Obtiene el material de etiquetado. Permite buscar por nombre, marca o código, y filtrar por tipo o añada.",
        tags=["Inventario - Etiquetas"],
        parameters=[
            OpenApiParameter(
                name="label_type",
                type=str,
                description="Filtrar por tipo (ej: FRONTAL, CONTRA, TIRILLA)",
            ),
            OpenApiParameter(
                name="vintage",
                type=int,
                description="Filtrar por añada específica (ej: 2023)",
            ),
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Término de búsqueda para nombre, marca o internal_code",
            ),
        ],
    ),
    create=extend_schema(
        summary="Crear material de etiquetado",
        tags=["Inventario - Etiquetas"],
        responses={
            201: LabelMaterialSerializer,
            400: OpenApiResponse(description="Datos inválidos"),
        },
    ),
    retrieve=extend_schema(
        summary="Detalle de etiqueta", tags=["Inventario - Etiquetas"]
    ),
    update=extend_schema(
        summary="Actualizar etiqueta (Put)", tags=["Inventario - Etiquetas"]
    ),
    partial_update=extend_schema(
        summary="Actualizar etiqueta (Patch)", tags=["Inventario - Etiquetas"]
    ),
    destroy=extend_schema(
        summary="Eliminar etiqueta",
        tags=["Inventario - Etiquetas"],
        responses={
            204: OpenApiResponse(description="Eliminado correctamente"),
            403: OpenApiResponse(description="No autorizado"),
        },
    ),
)
class LabelMaterialViewSet(viewsets.ModelViewSet):
    queryset = LabelMaterialModel.objects.all().order_by("-created_at")
    serializer_class = LabelMaterialSerializer
    permission_classes = [IsAuthenticated,RolePermission]
    filter_backends = [filters.SearchFilter]
    # En etiquetas incluimos brand_reference en la búsqueda por ser crítico operativamente
    search_fields = ["name", "internal_code", "brand_reference"]

    def get_queryset(self):
        queryset = super().get_queryset()
        l_type = self.request.query_params.get("label_type")
        vintage = self.request.query_params.get("vintage")

        if l_type:
            queryset = queryset.filter(label_type=l_type)
        if vintage:
            queryset = queryset.filter(vintage=vintage)
            
        return queryset
