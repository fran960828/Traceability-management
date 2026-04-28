from django.contrib import admin
from .models import WineAnalysis

@admin.register(WineAnalysis)
class WineAnalysisAdmin(admin.ModelAdmin):
    # --- LISTADO ---
    # Mostramos los parámetros más críticos en las columnas principales
    list_display = (
        'get_wine_name',
        'get_lot_number',
        'analysis_date',
        'alcohol_content',
        'ph',
        'volatile_acidity',
        'total_acidity',
        'gluconic_acid', # Clave para detectar podredumbre
    )
    
    # Filtros para navegar entre fechas, laboratorios o vinos específicos
    list_filter = (
        'analysis_date', 
        'laboratory', 
        'production_order__wine__name'
    )
    
    # Búsqueda por lote o por nombre del vino
    search_fields = (
        'production_order__lot_number', 
        'production_order__wine__name', 
        'laboratory'
    )
    
    # --- FORMULARIO DE EDICIÓN ---
    # Organizamos por grupos lógicos: Acidez, Azúcares/Alcohol y Color/Fenoles
    fieldsets = (
        ("Información General", {
            'fields': (('production_order', 'analysis_date'), 'laboratory')
        }),
        ("Equilibrio Alcohólico y Dulzor", {
            'fields': (('alcohol_content', 'reducing_sugars'),),
        }),
        ("Perfil de Acidez", {
            'fields': (('ph', 'total_acidity', 'volatile_acidity'), 
                       ('malic_acid', 'lactic_acid', 'gluconic_acid')),
        }),
        ("Estructura y Color", {
            'fields': (('IC', 'folin_index'),),
        }),
        ("Notas Adicionales", {
            'fields': ('observations',),
        }),
    )

    readonly_fields = ('created_at', 'updated_at')

    # --- MÉTODOS PARA COLUMNAS ---
    
    @admin.display(description='Vino', ordering='production_order__wine__name')
    def get_wine_name(self, obj):
        return obj.wine.name

    @admin.display(description='Lote', ordering='production_order__lot_number')
    def get_lot_number(self, obj):
        return obj.production_order.lot_number

   
