from django.contrib import admin

from inventory.models.enological_material_model import EnologicalMaterialModel


@admin.register(EnologicalMaterialModel)
class EnologicalMaterialAdmin(admin.ModelAdmin):
    list_display = (
        "internal_code",
        "name",
        "enological_type",
        "min_stock_level",
        "is_active",
    )
    list_editable = ("is_active",)
    list_filter = ("enological_type", "is_active")
    search_fields = ("name", "internal_code")
    readonly_fields = ("internal_code", "created_at", "updated_at")

    fields = (
        "internal_code",
        "name",
        "supplier",
        "enological_type",
        "commercial_format",
        "uom",
        "min_stock_level",
        "is_active",
        "description",
    )
