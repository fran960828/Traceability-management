from django.contrib import admin

from inventory.models import PackagingMaterialModel

from .mixins import StockStatusMixin


@admin.register(PackagingMaterialModel)
class PackagingMaterialAdmin(StockStatusMixin, admin.ModelAdmin):
    # La tabla principal: solo lo que necesitas para identificar el producto
    list_display = (
        "id",
        "name",
        "packaging_type",
        "color",
        "min_stock_level",
        "is_active",
        "capacity",
        "get_current_stock",  # Stock actual
        "stock_status",
    )

    # Filtro rápido a la derecha por tipo (Vidrio, Corcho...) y estado
    list_filter = ("packaging_type", "is_active")
    list_editable = ("is_active", "min_stock_level")
    # Buscador por nombre y código
    search_fields = ("name", "internal_code")

    # IMPORTANTE: Estos campos NO se pueden editar manualmente
    readonly_fields = ("internal_code", "created_at", "updated_at")

    # Formulario de creación: Simple, una columna tras otra
    fields = (
        "internal_code",
        "name",
        "supplier",
        "packaging_type",
        "specification",
        "color",
        "capacity",
        "unit_mesure",
        "min_stock_level",
        "is_active",
        "description",
    )

    # Optimizamos para no saturar la BD si hay muchos materiales
    def get_queryset(self, request):
        return super().get_queryset(request)
