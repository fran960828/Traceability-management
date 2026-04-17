from django.contrib import admin

from .models import Category, Supplier


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    # 1. Columnas que se ven en la tabla principal
    list_display = (
        "id",
        "supplier_code",
        "name",
        "tax_id",
        "category",
        "phone",
        "is_active",
        "created_at",
    )

    # 2. Filtros laterales para segmentar rápido
    list_filter = ("is_active", "category", "created_at")

    # 3. Campos por los que se puede buscar en la barra superior
    search_fields = ("name", "tax_id", "supplier_code", "email_pedidos")

    # 4. Organización de los campos dentro del formulario de edición
    fieldsets = (
        ("Identificación Fiscal", {"fields": ("supplier_code", "name", "tax_id")}),
        ("Clasificación y Logística", {"fields": ("category", "lead_time")}),
        ("Contacto", {"fields": ("email_pedidos", "phone", "address")}),
        ("Estado", {"fields": ("is_active",)}),
    )

    # 5. El código del proveedor es de solo lectura (se genera en el save)
    readonly_fields = ("supplier_code", "created_at")

    # 6. Orden por defecto (los más nuevos primero)
    ordering = ("-created_at",)
