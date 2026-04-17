from django.contrib import admin
from django.utils.html import format_html

from .models import PurchaseOrder, PurchaseOrderItem


class PurchaseOrderItemInline(admin.TabularInline):
    """Permite editar los productos directamente dentro de la ficha de la Orden."""

    model = PurchaseOrderItem
    extra = 1  # Muestra una línea vacía lista para rellenar
    fields = (
        "id",
        "packaging",
        "label",
        "enological",
        "quantity_ordered",
        "unit_price",
        "total_line",
    )
    readonly_fields = (
        "id",
        "total_line",
    )

    def total_line(self, obj):
        if obj.quantity_ordered and obj.unit_price:
            return f"{obj.quantity_ordered * obj.unit_price:.2f} €"
        return "0.00 €"

    total_line.short_description = "Subtotal"


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    # --- LISTADO PRINCIPAL ---
    list_display = (
        "id",
        "order_number",
        "supplier",
        "status_colored",
        "date_issued",
        "total_order_display",
    )
    list_filter = ("status", "supplier", "date_issued")
    search_fields = ("order_number", "supplier__name")
    readonly_fields = ("order_number", "date_issued")

    # --- FORMULARIO DE EDICIÓN ---
    fieldsets = (
        (
            "Información General",
            {"fields": (("order_number", "status"), "supplier", "notes")},
        ),
    )

    # Inyectamos las líneas de pedido
    inlines = [PurchaseOrderItemInline]

    # --- MÉTODOS DE APOYO (Visualización) ---
    def status_colored(self, obj):
        """Añade colores al estado para que el administrativo los vea de un vistazo."""
        colors = {
            "DRAFT": "#999",  # Gris
            "OPEN": "#28a745",  # Verde
            "CLOSED": "#007bff",  # Azul
            "CANCELLED": "#dc3545",  # Rojo
        }
        return format_html(
            '<span style="color: white; background-color: {}; padding: 3px 10px; border-radius: 10px; font-weight: bold;">{}</span>',
            colors.get(obj.status, "#000"),
            obj.get_status_display(),
        )

    status_colored.short_description = "Estado"

    def total_order_display(self, obj):
        """Calcula el total de la orden sumando sus líneas."""
        total = sum(item.quantity_ordered * item.unit_price for item in obj.items.all())
        return f"{total:,.2f} €"

    total_order_display.short_description = "Total Pedido"


# Opcional: Registrar los ítems por separado por si se quiere buscar un lote o producto específico
@admin.register(PurchaseOrderItem)
class PurchaseOrderItemAdmin(admin.ModelAdmin):
    fields = (
        "purchase_order",
        ("packaging", "label", "enological"),
        "quantity_ordered",
        "quantity_received",  # <--- Lo incluimos aquí...
        "unit_price",
    )
    readonly_fields = ("quantity_received",)
    list_display = ("purchase_order", "material_name", "quantity_ordered", "unit_price")
    list_filter = ("purchase_order__status", "purchase_order__supplier")
    search_fields = (
        "packaging__name",
        "label__name",
        "enological__name",
        "purchase_order__order_number",
    )
