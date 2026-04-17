from django.contrib import admin

from .models import ProductionEnologicalItem, ProductionOrder


class ProductionEnologicalItemInline(admin.TabularInline):
    """Permite ver los materiales enológicos dentro de la orden."""

    model = ProductionEnologicalItem
    extra = 0
    readonly_fields = ("material", "quantity_used")
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(ProductionOrder)
class ProductionOrderAdmin(admin.ModelAdmin):
    """
    Panel de auditoría para Órdenes de Producción.
    Configurado como Read-Only para proteger la lógica de negocio.
    """

    # 1. Vista de Lista (General)
    list_display = (
        "id",
        "lot_number",
        "wine",
        "production_date",
        "quantity_produced",
        "status",
        "user",
        "display_liters",
    )
    list_filter = ("status", "production_date", "wine")
    search_fields = ("lot_number", "wine__name", "notes")
    ordering = ("-production_date",)

    # 2. Vista de Detalle
    readonly_fields = (
        "wine",
        "user",
        "production_date",
        "quantity_produced",
        "lot_number",
        "status",
        "notes",
        "created_at",
        "display_liters",
    )
    inlines = [ProductionEnologicalItemInline]

    @admin.display(description="Volumen Total")
    def display_liters(self, obj):
        return f"{obj.total_liters} L"

    # 3. Restricciones de seguridad para el Admin
    def has_add_permission(self, request):
        # Desactiva el botón "Añadir" en el admin
        return False

    def has_delete_permission(self, request, obj=None):
        # Impide borrar órdenes desde el admin para no descuadrar el stock
        return False

    def has_change_permission(self, request, obj=None):
        # Solo permite ver, no editar
        return False
