# pricing/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver

from production_record.models import ProductionOrder
from pricing.utils.services import CostingService

@receiver(post_save, sender=ProductionOrder)
def create_production_costing_on_confirmation(sender, instance, **kwargs):
    """
    Genera el escandallo de costes automáticamente cuando la orden se confirma.
    Sigue la misma dinámica que el registro de trazabilidad.
    """
    # Solo actuamos si la orden está CONFIRMADA y NO tiene ya un registro de costes
    if instance.status == instance.Status.CONFIRMED and not hasattr(
        instance, "productioncosting"
    ):
        # Ejecutamos el servicio de cálculo
        # El servicio ya se encarga de crear el objeto ProductionCosting
        CostingService.generate_escandallo(instance)
