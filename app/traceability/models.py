# traceability/models.py
from django.core.exceptions import ValidationError
from django.db import models


class LotTraceability(models.Model):
    production_order = models.OneToOneField(
        'production_record.ProductionOrder',
        on_delete=models.CASCADE,
        related_name='traceability_record'
    )
    
    # "La Foto Fija": Guardamos aquí los nombres, lotes de proveedores y 
    # mermas calculadas en el momento de la confirmación.
    history_snapshot = models.JSONField(
        help_text="Copia de seguridad inalterable de los datos de producción."
    )
    
    # Firma digital o hash para verificar que nadie ha tocado la DB
    integrity_hash = models.CharField(max_length=255, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Expediente de Trazabilidad"
        verbose_name_plural = "Expedientes de Trazabilidad"

    def delete(self, *args, **kwargs):
        # Bloqueo total: un expediente de trazabilidad es sagrado.
        raise ValidationError("Los registros de trazabilidad no pueden ser eliminados por normativa.")
