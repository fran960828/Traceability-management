from django.contrib import admin

from inventory.models.label_material_model import LabelMaterialModel

from .mixins import StockStatusMixin


@admin.register(LabelMaterialModel)
class LabelMaterialAdmin(StockStatusMixin, admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "label_type",
        "min_stock_level",
        "is_active",
        "get_current_stock",  # Stock actual
        "stock_status",
    )
    list_editable = ("is_active", "min_stock_level")
    list_filter = ("label_type", "is_active")
    search_fields = ("name", "internal_code", "brand_reference")
    readonly_fields = ("internal_code", "created_at", "updated_at")

    fields = (
        "internal_code",
        "name",
        "supplier",
        "label_type",
        "brand_reference",
        "vintage",
        "unit_mesure",
        "min_stock_level",
        "is_active",
        "description",
    )

    # Optimizamos para no saturar la BD si hay muchos materiales
    def get_queryset(self, request):
        return super().get_queryset(request)
