from django.contrib import admin

from inventory.models.label_material_model import LabelMaterialModel


@admin.register(LabelMaterialModel)
class LabelMaterialAdmin(admin.ModelAdmin):
    list_display = (
        "internal_code",
        "name",
        "label_type",
        "min_stock_level",
        "is_active",
    )
    list_editable = ("is_active",)
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
