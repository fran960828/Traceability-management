from drf_spectacular.utils import (OpenApiParameter, OpenApiResponse,
                                   extend_schema, extend_schema_view)
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

from inventory.views.mixins import InventoryAlertMixin
from utils.mixins import CloneMixin
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
    clone_prefill=extend_schema(
        summary="Preparar datos para clonar etiqueta",
        description=(
            "Recupera los datos de una etiqueta existente para crear una nueva (ej: nueva añada). "
            "Limpia IDs, stock actual y la añada para obligar a su revisión."
        ),
        tags=["Inventario - Etiquetas"],
        responses={200: LabelMaterialSerializer},
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
    alerts=extend_schema(
        summary="Listar labels bajo mínimos",
        description="Devuelve los productos de etiqueta cuyo stock actual es inferior al mínimo establecido.",
        tags=["Inventario - Etiquetas"],
        responses={200: LabelMaterialModel},
    ),
)
class LabelMaterialViewSet(CloneMixin, InventoryAlertMixin, viewsets.ModelViewSet):
    queryset = LabelMaterialModel.objects.all().order_by("-created_at")
    serializer_class = LabelMaterialSerializer
    permission_classes = [IsAuthenticated, RolePermission]
    filter_backends = [filters.SearchFilter]
    # En etiquetas incluimos brand_reference en la búsqueda por ser crítico operativamente
    search_fields = ["name", "internal_code", "brand_reference"]
    clone_reset_fields = [
        "id",
        "internal_code",
        "vintage",  # La nueva etiqueta será de otro año
        "created_at",
        "updated_at",
    ]

    def get_queryset(self):
        queryset = super().get_queryset()
        l_type = self.request.query_params.get("label_type")
        vintage = self.request.query_params.get("vintage")

        if l_type:
            queryset = queryset.filter(label_type=l_type)
        if vintage:
            queryset = queryset.filter(vintage=vintage)

        return queryset

    def prepare_clone_data(self, data, instance):
        """
        Personalizamos el pre-llenado de etiquetas.
        """
        # Sugerimos un nombre identificativo
        data["name"] = f"COPIA - {instance.name}"

        # Por seguridad, la nueva etiqueta nace inactiva hasta que se verifique
        data["is_active"] = False

        # Mantenemos: supplier, label_type, brand_reference, unit_mesure y min_stock_level
        # ya que son datos técnicos que no suelen variar entre años.
        return data

    def perform_create(self, serializer):
        """
        Al crear una etiqueta nueva, desactivamos la añada anterior
        del mismo tipo y referencia de marca.
        """
        # 1. Guardamos la nueva etiqueta
        new_label = serializer.save()

        # 2. Relevo: Desactivamos etiquetas con mismo nombre y marca, pero añada anterior
        LabelMaterialModel.objects.filter(
            name=new_label.name,
            brand_reference=new_label.brand_reference,  # Aseguramos que es el mismo vino
            label_type=new_label.label_type,  # Misma posición (Frontal, Contra...)
            is_active=True,
        ).exclude(id=new_label.id).update(is_active=False)
