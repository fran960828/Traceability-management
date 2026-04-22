from drf_spectacular.utils import (OpenApiParameter, extend_schema,
                                   extend_schema_view)
from rest_framework import filters, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from utils.permissions import PurchaseRolePermission # Mantenemos coherencia de roles

from .models import LotTraceability
from .serializers import LotTraceabilitySerializer
from traceability.utils.pdf_generator import export_traceability_pdf

@extend_schema_view(
    list=extend_schema(
        summary="Listar expedientes de trazabilidad",
        description="Consulta el histórico de trazabilidad inalterable de los lotes producidos.",
        tags=["Calidad y Trazabilidad"],
        parameters=[
            OpenApiParameter(
                name="lot_number", type=str, description="Buscar por número de lote exacto"
            ),
            OpenApiParameter(
                name="wine_name", type=str, description="Filtrar por nombre del vino en el snapshot"
            ),
        ],
    ),
    retrieve=extend_schema(
        summary="Detalle del expediente de trazabilidad",
        description="Recupera el snapshot técnico y verifica la integridad del hash.",
        tags=["Calidad y Trazabilidad"],
    ),
)
class LotTraceabilityViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para la consulta de trazabilidad.
    No permite creación ni edición manual para garantizar la integridad de los datos.
    """
    
    # Optimizamos con select_related para traer la orden de una sola vez
    queryset = LotTraceability.objects.select_related("production_order", "production_order__wine").all()
    serializer_class = LotTraceabilitySerializer
    permission_classes = [IsAuthenticated, PurchaseRolePermission]
    
    # Configuramos la búsqueda para que el auditor pueda usar el buscador global
    filter_backends = [filters.SearchFilter]
    search_fields = ["production_order__lot_number", "history_snapshot__order_details__wine_name"]

    # Permitimos buscar un lote directamente en la URL si queremos: /api/traceability/L26-001/
    lookup_field = 'production_order__lot_number'
    lookup_url_kwarg = 'lot_number'

    @extend_schema(
        summary="Descargar informe de trazabilidad en PDF",
        description="Genera y descarga el informe técnico oficial con sello de integridad.",
        tags=["Calidad y Trazabilidad"],
        responses={200: 'application/pdf'}
    )
    @action(detail=True, methods=['get'], url_path='download-pdf')
    def download_pdf(self, request, lot_number=None):
        """
        Endpoint: GET /api/traceability/{lot_number}/download-pdf/
        """
        # 1. Recuperamos la instancia (usando el lookup_field de la clase)
        instance = self.get_object()

        try:
            # 2. Generamos el PDF usando la utilidad de WeasyPrint
            pdf_content = export_traceability_pdf(instance)

            # 3. Preparamos la respuesta HTTP
            filename = f"Informe_Trazabilidad_{instance.production_order.lot_number}.pdf"
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response

        except Exception as e:
            return Response(
                {"detail": f"Error al generar el PDF: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros específicos por query params
        lot_number = self.request.query_params.get("lot_number")
        wine_name = self.request.query_params.get("wine_name")

        if lot_number:
            queryset = queryset.filter(production_order__lot_number=lot_number)
        
        if wine_name:
            # Buscamos dentro del JSONField (Snapshot)
            queryset = queryset.filter(history_snapshot__order_details__wine_name__icontains=wine_name)

        return queryset
