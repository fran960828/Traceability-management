from drf_spectacular.utils import (OpenApiParameter, OpenApiResponse,
                                   extend_schema, extend_schema_view)
from django.core.exceptions import ValidationError
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from utils.permissions import PurchaseRolePermission
from rest_framework.response import Response
from django.db import transaction
from django.db import models
from .models import Location, StockMovement
from .serializers import (
    LocationSerializer, 
    StockMovementSerializer, 
    BulkReceptionSerializer,
    StockTransferSerializer
)

@extend_schema_view(
    list=extend_schema(summary="Listar ubicaciones", tags=["Localización de Stock"]),
    create=extend_schema(summary="Crear ubicación", tags=["Localización de Stock"]),
    retrieve=extend_schema(summary="Detalle de ubicación", tags=["Localización de Stock"]),
    update=extend_schema(summary="Actualizar ubicación (Put)", tags=["Localización de Stock"]),
    partial_update=extend_schema(summary="Actualizar ubicación (Patch)", tags=["Localización de Stock"]),
    destroy=extend_schema(summary="Eliminar ubicación", tags=["Localización de Stock"]),
)
class LocationViewSet(viewsets.ModelViewSet):
    """
    CRUD para la gestión de zonas físicas (Almacenes, Cámaras, etc.).
    """
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [IsAuthenticated,PurchaseRolePermission]


@extend_schema_view(
    list=extend_schema(
        summary="Historial de movimientos avanzado",
        description="Consulta movimientos con filtros por Proveedor, Producto, Lote o Ubicación.",
        tags=["Operaciones de Almacén"],
        parameters=[
            OpenApiParameter(name="movement_type", type=str, description="IN, OUT, ADJ, TRA"),
            OpenApiParameter(name="supplier", type=int, description="Filtrar por ID del Proveedor"),
            OpenApiParameter(name="product_name", type=str, description="Filtrar por nombre del producto (enológico, material, etc.)"),
            OpenApiParameter(name="location", type=int, description="Filtrar por ID de ubicación"),
            OpenApiParameter(
                name="date_from", 
                type=str, 
                location=OpenApiParameter.QUERY, 
                description="Fecha inicio (YYYY-MM-DD). Ejemplo: 2026-04-01",
                # Opcional: puedes añadir un ejemplo real
            ),
            OpenApiParameter(
                name="date_to", 
                type=str, 
                location=OpenApiParameter.QUERY, 
                description="Fecha fin (YYYY-MM-DD). Ejemplo: 2026-04-30",
            ),
        ]
    ),
    retrieve=extend_schema(summary="Detalle de un movimiento", tags=["Operaciones de Almacén"]),
)
class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Libro de registro inmutable de stock.
    Las entradas, transferencias y ajustes se realizan mediante acciones (@action).
    """
    queryset = StockMovement.objects.select_related(
        'batch__order_item__purchase_order__supplier',
        'location', 
        'user'
    ).all()
    serializer_class = StockMovementSerializer
    permission_classes = [IsAuthenticated,PurchaseRolePermission]
    filter_backends = [filters.SearchFilter]
    search_fields = [
        "batch__batch_number", 
        "batch__order_item__packaging__name",
        "batch__order_item__enological__name",
        "batch__order_item__label__name"
    ]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros por Query Params
        m_type = self.request.query_params.get("movement_type")
        supplier_id = self.request.query_params.get("supplier")
        product_name = self.request.query_params.get("product_name")
        loc_id = self.request.query_params.get("location")

        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if m_type: 
            queryset = queryset.filter(movement_type=m_type)
        
        if supplier_id:
            queryset = queryset.filter(batch__order_item__purchase_order__supplier_id=supplier_id)
        
        if product_name:
            # Filtramos en los tres tipos de materiales posibles
            queryset = queryset.filter(
                models.Q(batch__order_item__packaging__name__icontains=product_name) |
                models.Q(batch__order_item__enological__name__icontains=product_name) |
                models.Q(batch__order_item__label__name__icontains=product_name)
            )

        if loc_id: 
            queryset = queryset.filter(location_id=loc_id)
        
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
            
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        return queryset.order_by('-created_at')

    @extend_schema(
        summary="Recepción masiva (Entrada)",
        request=BulkReceptionSerializer,
        tags=["Operaciones de Almacén"]
    )
    @action(detail=False, methods=['post'], url_path='bulk-receive')
    def bulk_receive(self, request):
        serializer = BulkReceptionSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            try:
                serializer.save()
                return Response({"detail": "Entrada registrada."}, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Transferencia entre ubicaciones",
        description="Mueve stock de una ubicación a otra creando dos movimientos vinculados (OUT e IN).",
        request=StockTransferSerializer, 
        tags=["Operaciones de Almacén"]
    )
    @action(detail=False, methods=['post'], url_path='transfer')
    def transfer_stock(self, request):
        origin_id = request.data.get('origin_location')
        dest_id = request.data.get('destination_location')
        batch_id = request.data.get('batch')
        
        try:
            qty = abs(int(request.data.get('quantity', 0)))
        except (ValueError, TypeError):
            return Response({"detail": "La cantidad debe ser un número válido."}, status=status.HTTP_400_BAD_REQUEST)

        if not all([origin_id, dest_id, batch_id, qty]):
            return Response({"detail": "Faltan datos para la transferencia."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # Al estar dentro de atomic, si el segundo falla, el primero se revierte
                StockMovement.objects.create(
                    batch_id=batch_id, location_id=origin_id,
                    quantity=-qty, movement_type='OUT',
                    user=request.user, notes=f"Transferencia a ubicación {dest_id}"
                )
                StockMovement.objects.create(
                    batch_id=batch_id, location_id=dest_id,
                    quantity=qty, movement_type='IN',
                    user=request.user, notes=f"Transferencia desde ubicación {origin_id}"
                )
        except ValidationError as e:
            # Capturamos el error del modelo y lo devolvemos como 400
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": f"Error inesperado: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({"detail": "Transferencia completada."}, status=status.HTTP_201_CREATED)

    @extend_schema(summary="Ajuste de Inventario", tags=["Operaciones de Almacén"])
    @action(detail=False, methods=['post'], url_path='adjustment')
    def stock_adjustment(self, request):
        data = request.data.copy()
        data['movement_type'] = StockMovement.MovementType.ADJUSTMENT
        serializer = StockMovementSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save(user=request.user,movement_type=StockMovement.MovementType.ADJUSTMENT)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="Retirada/Merma de Stock", tags=["Operaciones de Almacén"])
    @action(detail=False, methods=['post'], url_path='dispose')
    def stock_dispose(self, request):
        data = request.data.copy()
        data['movement_type'] = StockMovement.MovementType.OUT
        serializer = StockMovementSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save(user=request.user,movement_type=StockMovement.MovementType.OUT)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
