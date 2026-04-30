import json

from django.contrib import admin
from django.utils.safestring import mark_safe

from .models import IndirectCostConfig, ProductionCosting


@admin.register(IndirectCostConfig)
class IndirectCostConfigAdmin(admin.ModelAdmin):
    # Columnas que se verán en el listado
    list_display = (
        'name', 
        'is_active', 
        'labor_rate', 
        'energy_rate', 
        'amortization_rate', 
        'get_total_rate',
        'created_at'
    )
    
    # Filtros laterales
    list_filter = ('is_active', 'created_at')
    
    # Campos de búsqueda
    search_fields = ('name',)
    
    # Organización de los campos dentro del formulario de edición
    fieldsets = (
        (None, {
            'fields': ('name', 'is_active')
        }),
        ('Tasas por Unidad (Euros)', {
            'fields': ('labor_rate', 'energy_rate', 'amortization_rate'),
            'description': 'Define los costes indirectos aplicados a cada unidad producida.'
        }),
    )

    # Método para mostrar el total de la tasa en el listado
    @admin.display(description='Total Tasa (€)')
    def get_total_rate(self, obj):
        total = obj.labor_rate + obj.energy_rate + obj.amortization_rate
        return f"{total:.4f} €"

    # Colorear el icono de "is_active" para que destaque
    get_total_rate.short_description = 'Carga Indirecta Total'




@admin.register(ProductionCosting)
class ProductionCostingAdmin(admin.ModelAdmin):
    # --- LISTADO ---
    list_display = (
        'production_order', 
        'get_lot_number', 
        'unit_cost', 
        'grand_total', 
        'created_at'
    )
    list_filter = ('created_at',)
    search_fields = ('production_order__lot_number', 'production_order__wine__name')
    ordering = ('-created_at',)

    # --- DETALLE (LECTURA) ---
    readonly_fields = (
        'production_order', 
        'unit_cost', 
        'grand_total', 
        'total_material_cost', 
        'total_indirect_cost', 
        'labor_total', 
        'energy_total', 
        'amortization_total', 
        'display_materials_json', # Mostramos el JSON formateado
        'created_at'
    )

    # Quitamos la posibilidad de editar campos o añadir nuevos a mano
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    # --- MÉTODOS AUXILIARES ---

    @admin.display(description="Lote")
    def get_lot_number(self, obj):
        return obj.production_order.lot_number

    @admin.display(description="Desglose de Materiales (Snapshot)")
    def display_materials_json(self, obj):
        """Formatea el JSON de materiales para que sea legible en el admin."""
        content = json.dumps(obj.materials_snapshot, indent=4, ensure_ascii=False)
        return mark_safe(f'<pre style="background: #f8f9fa; padding: 10px; border: 1px solid #ddd;">{content}</pre>')

    # Organización visual en el detalle
    fieldsets = (
        ("Orden Relacionada", {
            'fields': ('production_order', 'created_at')
        }),
        ("Costes de Producción", {
            'fields': (
                ('unit_cost', 'grand_total'),
                ('total_material_cost', 'total_indirect_cost')
            )
        }),
        ("Desglose Indirectos (Snapshot)", {
            'fields': (('labor_total', 'energy_total', 'amortization_total'),),
            'classes': ('collapse',) # Se puede plegar
        }),
        ("Desglose de Materiales (Snapshot)", {
            'fields': ('display_materials_json',),
        }),
    )