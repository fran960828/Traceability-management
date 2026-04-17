from django.contrib import admin

from inventory.models.enological_material_model import EnologicalMaterialModel

from .mixins import StockStatusMixin


@admin.register(EnologicalMaterialModel)
class EnologicalMaterialAdmin(StockStatusMixin, admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "enological_type",
        "min_stock_level",
        "is_active",
        "get_current_stock",  # Stock actual
        "stock_status",
    )
    list_editable = ("is_active", "min_stock_level")
    list_filter = ("enological_type", "is_active")
    search_fields = ("name", "internal_code")
    readonly_fields = ("internal_code", "created_at", "updated_at")

    fields = (
        "internal_code",
        "name",
        "supplier",
        "enological_type",
        "commercial_format",
        "unit_mesure",
        "min_stock_level",
        "is_active",
        "description",
    )

    # Optimizamos para no saturar la BD si hay muchos materiales
    def get_queryset(self, request):
        return super().get_queryset(request)
