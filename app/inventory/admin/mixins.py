from django.contrib import admin
from django.utils.html import mark_safe


class StockStatusMixin:
    @admin.display(description="Stock Actual")
    def get_current_stock(self, obj):
        """Muestra el stock con su unidad de medida"""
        # Asegúrate de que el método get_unit_mesure_display exista en el modelo
        unit = (
            obj.get_unit_mesure_display()
            if hasattr(obj, "get_unit_mesure_display")
            else ""
        )
        return f"{obj.current_stock} {unit}"

    @admin.display(description="Estado")
    def stock_status(self, obj):
        """Indicador visual tipo semáforo"""
        if not hasattr(obj, "min_stock_level") or obj.min_stock_level == 0:
            return mark_safe('<span style="color: gray;">⚪ Sin control</span>')

        if obj.is_low_stock:
            return mark_safe(
                '<span style="color: #d9534f; font-weight: bold;">🔴 BAJO MÍNIMO</span>'
            )
        return mark_safe('<span style="color: #5cb85c;">🟢 OK</span>')
