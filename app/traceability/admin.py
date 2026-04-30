import json

from django.contrib import admin
from django.utils.safestring import mark_safe

from .models import LotTraceability


@admin.register(LotTraceability)
class LotTraceabilityAdmin(admin.ModelAdmin):
    # Usamos 'production_order' que es tu campo real
    list_display = ('get_lot_number', 'get_wine_name', 'created_at')
    list_filter = ('created_at',)
    
    # readonly_fields debe coincidir con los nombres de los campos de tu modelo
    readonly_fields = (
        'production_order', 
        'integrity_hash', 
        'created_at', 
        'full_snapshot_display'
    )
    
    fieldsets = (
        ('Relación de Producción', {
            'fields': ('production_order', 'created_at')
        }),
        ('Seguridad Criptográfica', {
            'fields': ('integrity_hash',),
            'description': 'Sello digital que garantiza la inalterabilidad del registro.'
        }),
        ('Expediente Digital (Snapshot)', {
            'fields': ('full_snapshot_display',),
        }),
    )

    # --- MÉTODOS PARA MEJORAR LA VISUALIZACIÓN ---

    @admin.display(description='Número de Lote')
    def get_lot_number(self, obj):
        """Muestra el lote de la orden asociada en la lista."""
        return obj.production_order.lot_number

    @admin.display(description='Vino')
    def get_wine_name(self, obj):
        """Extrae el nombre del vino desde el snapshot JSON."""
        return obj.history_snapshot.get('order_details', {}).get('wine_name', 'N/A')

    @admin.display(description='Contenido del Snapshot')
    def full_snapshot_display(self, obj):
        """Renderiza el JSON de forma jerárquica y legible."""
        pretty_json = json.dumps(obj.history_snapshot, indent=4, ensure_ascii=False)
        style = (
            "background: #272822; color: #f8f8f2; padding: 15px; "
            "border-radius: 5px; font-family: 'Courier New', monospace; "
            "overflow-x: auto; line-height: 1.5;"
        )
        return mark_safe(f'<pre style="{style}">{pretty_json}</pre>')

    # --- PROTECCIÓN DEL REGISTRO (POLÍTICA DE SOLO LECTURA) ---

    def has_add_permission(self, request):
        return False  # Se crea vía señales/lógica, no manual

    def has_change_permission(self, request, obj=None):
        return False  # No se puede editar

    def has_delete_permission(self, request, obj=None):
        return False  # Bloqueado también en Admin (coherente con tu modelo)
