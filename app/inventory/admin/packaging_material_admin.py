from django.contrib import admin

from inventory.models import PackagingMaterialModel


@admin.register(PackagingMaterialModel)
class PackagingMaterialAdmin(admin.ModelAdmin):
    # La tabla principal: solo lo que necesitas para identificar el producto
    list_display = (
        "internal_code",
        "name",
        "packaging_type",
        "color",
        "min_stock_level",
        "is_active",
    )

    # Filtro rápido a la derecha por tipo (Vidrio, Corcho...) y estado
    list_filter = ("packaging_type", "is_active")

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
        "uom",
        "min_stock_level",
        "is_active",
        "description",
    )
