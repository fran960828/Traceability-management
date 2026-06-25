from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import OuterRef, Subquery  # 🟢 Necesarios para el filtrado avanzado
from drf_spectacular.utils import (OpenApiParameter, extend_schema,
                                   extend_schema_view)
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from utils.permissions import PurchaseRolePermission

from stock.models import Location, StockMovement
from stock.serializers import (BulkReceptionSerializer, LocationSerializer,
                          StockMovementSerializer, StockTransferSerializer, StockAdjustmentSerializer)


@extend_schema_view(
    list=extend_schema(summary="Listar ubicaciones", tags=["Localización de Stock"]),
    create=extend_schema(summary="Crear ubicación", tags=["Localización de Stock"]),
    retrieve=extend_schema(
        summary="Detalle de ubicación", tags=["Localización de Stock"]
    ),
    update=extend_schema(
        summary="Actualizar ubicación (Put)", tags=["Localización de Stock"]
    ),
    partial_update=extend_schema(
        summary="Actualizar ubicación (Patch)", tags=["Localización de Stock"]
    ),
    destroy=extend_schema(summary="Eliminar ubicación", tags=["Localización de Stock"]),
)
class LocationViewSet(viewsets.ModelViewSet):
    """
    CRUD para la gestión de zonas físicas (Almacenes, Cámaras, etc.).
    """

    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [IsAuthenticated, PurchaseRolePermission]


@extend_schema_view(
    list=extend_schema(
        summary="Historial de movimientos avanzado",
        description="Consulta movimientos con filtros por Proveedor, Producto, Lote o Ubicación.",
        tags=["Operaciones de Almacén"],
        parameters=[
            OpenApiParameter(
                name="movement_type", type=str, description="IN, OUT, ADJ, TRA"
            ),
            OpenApiParameter(
                name="supplier", type=int, description="Filtrar por ID del Proveedor"
            ),
            OpenApiParameter(
                name="product_name",
                type=str,
                description="Filtrar por nombre del producto (enológico, material, etc.)",
            ),
            OpenApiParameter(
                name="location", type=int, description="Filtrar por ID de ubicación"
            ),
            OpenApiParameter(
                name="available_only", type=bool, description="True para aislar lotes vivos sin TRANS_OUT ni stock cero"
            ),
            OpenApiParameter(
                name="date_from",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Fecha inicio (YYYY-MM-DD). Ejemplo: 2026-04-01",
            ),
            OpenApiParameter(
                name="date_to",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Fecha fin (YYYY-MM-DD). Ejemplo: 2026-04-30",
            ),
        ],
    ),
    retrieve=extend_schema(
        summary="Detalle de un movimiento", tags=["Operaciones de Almacén"]
    ),
)
class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Libro de registro inmutable de stock.
    Las entradas, transferencias y ajustes se realizan mediante acciones (@action).
    """

    queryset = StockMovement.objects.select_related(
        "batch__order_item__purchase_order__supplier", "location", "user"
    ).all()
    serializer_class = StockMovementSerializer
    permission_classes = [IsAuthenticated, PurchaseRolePermission]
    filter_backends = [filters.SearchFilter]
    search_fields = [
        "batch__batch_number",
        "batch__order_item__packaging__name",
        "batch__order_item__enological__name",
        "batch__order_item__label__name",
    ]

    def get_queryset(self):
        # 🟢 Solución a ordenamiento por defecto antes del filtrado condicional
        queryset = super().get_queryset()

        # Captura de Query Params
        available_only = self.request.query_params.get("available_only", "false") == "true"
        m_type = self.request.query_params.get("movement_type")
        supplier_id = self.request.query_params.get("supplier")
        product_name = self.request.query_params.get("product_name")
        loc_id = self.request.query_params.get("location")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        # 🟢 MODIFICACIÓN: Si se solicita el panel operativo de "Existencias y Lotes Disponibles"
        if available_only:
            # 1. Subquery para aislar exclusivamente el último movimiento ('id' más alto) de cada lote
            latest_movement_subquery = StockMovement.objects.filter(
                batch=OuterRef("batch")
            ).order_by("-id").values("id")[:1]

            # 2. Forzamos a la base de datos a quedarse solo con esas filas definitivas
            queryset = queryset.filter(id=Subquery(latest_movement_subquery))

            # 3. Excluimos los que se quedaron sin saldo físico real y los que salieron de la zona vía TRANS_OUT
            queryset = queryset.filter(
                batch__current_stock_cache__gt=0
            ).exclude(
                movement_type="TRANS_OUT"
            )

        # --- Filtros Estándar (Compartidos / Aplicables) ---
        if m_type and not available_only: # Evita colisiones de tipo en la pestaña disponible
            queryset = queryset.filter(movement_type=m_type)

        if supplier_id:
            queryset = queryset.filter(
                batch__order_item__purchase_order__supplier_id=supplier_id
            )

        if product_name:
            queryset = queryset.filter(
                models.Q(batch__order_item__packaging__name__icontains=product_name)
                | models.Q(batch__order_item__enological__name__icontains=product_name)
                | models.Q(batch__order_item__label__name__icontains=product_name)
            )

        if loc_id:
            queryset = queryset.filter(location_id=loc_id)

        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)

        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        # Mantenemos el Libro Diario ordenado cronológicamente con paginación limpia
        return queryset.order_by("-created_at")

    @extend_schema(
        summary="Recepción masiva (Entrada)",
        request=BulkReceptionSerializer,
        tags=["Operaciones de Almacén"],
    )
    @action(detail=False, methods=["post"], url_path="bulk-receive")
    def bulk_receive(self, request):
        serializer = BulkReceptionSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            try:
                serializer.save()
                return Response(
                    {"detail": "Entrada registrada."}, status=status.HTTP_201_CREATED
                )
            except Exception as e:
                return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Transferencia entre ubicaciones",
        description="Mueve stock de una ubicación a otra creando dos movimientos vinculados (OUT e IN) con traza de transferencia.",
        request=StockTransferSerializer,
        tags=["Operaciones de Almacén"],
    )
    @action(detail=False, methods=["post"], url_path="transfer")
    def transfer_stock(self, request):
        serializer = StockTransferSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        batch = serializer.validated_data["batch"]
        origin = serializer.validated_data["origin_location"]
        dest = serializer.validated_data["destination_location"]
        qty = serializer.validated_data["quantity"]
        notes = serializer.validated_data.get("notes", "")

        try:
            with transaction.atomic():
                # Movimiento de SALIDA por Transferencia.
                StockMovement.objects.create(
                    batch=batch,
                    location=origin,
                    quantity=-qty,
                    movement_type="TRANS_OUT",  
                    user=request.user,
                    notes=f"📦 [TRANSFERENCIA] Salida hacia {dest.name}. {notes}".strip(),
                )

                # Movimiento de ENTRADA por Transferencia
                StockMovement.objects.create(
                    batch=batch,
                    location=dest,
                    quantity=qty,
                    movement_type="TRANS_IN",  
                    user=request.user,
                    notes=f"📦 [TRANSFERENCIA] Entrada desde {origin.name}. {notes}".strip(),
                )

        except ValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"detail": f"Error inesperado en el servidor: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"detail": "Transferencia registrada exitosamente."}, 
            status=status.HTTP_201_CREATED
        )
    
    @extend_schema(
        summary="Ajuste de Inventario",
        description="Registra una merma o un ajuste manual sobre un lote controlando que no baje de cero.",
        request=StockAdjustmentSerializer,
        tags=["Operaciones de Almacén"]
    )
    @action(detail=False, methods=["post"], url_path="adjustment")
    def stock_adjustment(self, request):
        serializer = StockAdjustmentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            serializer.save(
                user=request.user,
                movement_type=StockMovement.MovementType.ADJUSTMENT
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"detail": f"Error crítico inesperado en el servidor: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

