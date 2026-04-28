from django.db.models.signals import post_save
from django.dispatch import receiver
from production_record.models import ProductionOrder
from pricing.utils.services import CostingService
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=ProductionOrder)
def create_production_costing_on_confirmation(sender, instance, created, **kwargs):
    """
    Señal que dispara el cálculo del escandallo automáticamente cuando 
    una orden de producción cambia su estado a CONFIRMED.
    """
    if instance.status == ProductionOrder.Status.CONFIRMED:
        # 3. Verificamos si ya existe un coste para no duplicar (Idempotencia)
        if not hasattr(instance, 'productioncosting'):
            try:
                logger.info(f"Generando escandallo para la orden {instance.lot_number}")
                CostingService.generate_escandallo(instance)
            except Exception as e:
                # Importante: Loguear el error porque las señales fallan silenciosamente
                logger.error(f"Error generando escandallo automático para {instance.id}: {str(e)}")