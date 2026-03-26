from drf_spectacular.utils import (OpenApiParameter, OpenApiResponse,
                                   extend_schema, extend_schema_view)
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

from supplier.permissions import SupplierRolePermission
from supplier.serializers import CategorySerializer, SupplierSerializer

from .models import Category, Supplier


@extend_schema_view(
    list=extend_schema(
        summary="Listar categorías",
        description="Obtiene todas las categorías (Corcho, Vidrio, etc.) para llenar los selectores del frontend.",
        tags=["Categoría del proveedor"],
    ),
    retrieve=extend_schema(
        summary="Detalle de categoría",
        description="Obtiene la información de una categoría específica.",
        tags=["Categoría del proveedor"],
    ),
)
class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    CRUD completo para las categorías (Corchos, Vidrio, etc.)
    """

    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]


@extend_schema_view(
    list=extend_schema(
        summary="Listar proveedores con filtros",
        description="Obtiene los proveedores. Permite buscar por nombre/NIF y filtrar por ID de categoría.",
        tags=["Gestión de Proveedores"],
        parameters=[
            OpenApiParameter(
                name="category",
                type=int,
                location=OpenApiParameter.QUERY,
                description="ID de la categoría para filtrar resultados.",
            ),
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Término de búsqueda para nombre o tax_id.",
            ),
        ],
    ),
    create=extend_schema(
        summary="Crear proveedor",
        description="Registra un nuevo proveedor. Requiere rol ENOLOGO o COMPRAS. código PRO- automatico",
        tags=["Gestión de Proveedores"],
        responses={
            201: SupplierSerializer,
            400: OpenApiResponse(description="Datos inválidos"),
        },
    ),
    retrieve=extend_schema(summary="Ver proveedor", tags=["Gestión de Proveedores"]),
    update=extend_schema(
        summary="Actualizar proveedor (Put)", tags=["Gestión de Proveedores"]
    ),
    partial_update=extend_schema(
        summary="Actualizar proveedor (Patch)", tags=["Gestión de Proveedores"]
    ),
    destroy=extend_schema(
        summary="Eliminar proveedor",
        description="**Acción crítica:** Solo el ENOLOGO puede borrar proveedores.",
        tags=["Gestión de Proveedores"],
        responses={
            204: OpenApiResponse(description="Eliminado correctamente"),
            403: OpenApiResponse(description="No autorizado"),
        },
    ),
)
class SupplierViewSet(viewsets.ModelViewSet):
    """
    CRUD completo para Proveedores con lógica de filtrado
    """

    queryset = Supplier.objects.all().order_by("-created_at")
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated, SupplierRolePermission]

    # Añadimos el motor de búsqueda nativo de DRF
    filter_backends = [filters.SearchFilter]
    # Configuramos qué campos queremos que sean buscables por texto
    search_fields = ["name", "tax_id"]

    def get_queryset(self):
        """
        Filtrado por ID de categoría proveniente del Select de React
        """
        queryset = Supplier.objects.all().order_by("-created_at")

        # El select de React enviará el ID de la categoría
        category_id = self.request.query_params.get("category")

        if category_id:
            queryset = queryset.filter(category_id=category_id)

        return queryset
