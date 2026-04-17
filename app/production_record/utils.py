from django.core.exceptions import ValidationError

def validate_production_volume_integrity(total_liters, bulk_liters_withdrawn):
    """
    Comprueba que el vino extraído sea suficiente para el embotellado.
    """
    if bulk_liters_withdrawn is not None and total_liters is not None:
        if bulk_liters_withdrawn < total_liters:
            raise ValidationError({
                "bulk_liters_withdrawn": (
                    f"Los litros extraídos ({bulk_liters_withdrawn}L) "
                    f"no pueden ser menores al volumen embotellado ({total_liters}L)."
                )
            })
        
def validate_production_order_immutability(instance):
    """
    Mantiene la integridad de la orden una vez confirmada.
    Copia exacta de tu lógica original.
    """
    if instance.pk and instance.status == instance.Status.CONFIRMED:
        # Importación local para evitar importaciones circulares si fuera necesario
        
        from .models.production_order_model import ProductionOrder
        original = ProductionOrder.objects.get(pk=instance.pk)
        if original.quantity_produced != instance.quantity_produced:
            raise ValidationError(
                "No se puede modificar la cantidad de una orden confirmada."
            )