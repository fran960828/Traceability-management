from django.contrib import admin
from .models import Location,StockMovement
from django.utils.html import format_html


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    # Columnas que se ven en la tabla principal
    list_display = ('name', 'description', 'is_active', 'created_at')
    
    # Filtros laterales para navegar rápido
    list_filter = ('is_active', 'created_at')
    
    # Buscador por nombre y descripción
    search_fields = ('name', 'description')
    
    # Campos que se pueden editar directamente en la lista sin entrar al detalle
    list_editable = ('is_active',)
    
    # Orden predeterminado (alfabético por nombre)
    ordering = ('name',)

from django.contrib import admin


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    # 1. Definimos qué columnas queremos ver
    list_display = ('id', 'display_type', 'batch', 'location', 'quantity', 'user', 'created_at')
    
    # 2. Filtros para encontrar cosas rápido
    list_filter = ('movement_type', 'created_at', 'location')
    
    # 3. Buscador por número de lote y notas
    search_fields = ('batch__batch_number', 'notes')
    
    # 4. Hacemos que TODO sea de solo lectura para proteger la trazabilidad
    readonly_fields = ('movement_type', 'batch', 'location', 'quantity', 'user', 'notes', 'created_at')

    # 5. Estética: Colores para los tipos de movimiento
    def display_type(self, obj):
        colors = {
            'IN': '#28a745',   # Verde para entradas
            'OUT': '#dc3545',  # Rojo para salidas/mermas
            'ADJ': '#ffc107',  # Amarillo para ajustes
        }
        color = colors.get(obj.movement_type, 'black')
        return format_html(
            '<b style="color: {};">{}</b>',
            color,
            obj.get_movement_type_display()
        )
    display_type.short_description = "Tipo"

    def has_add_permission(self, request): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False
