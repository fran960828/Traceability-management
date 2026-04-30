# traceability/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver

from production_record.models import ProductionOrder
from traceability.utils.hash_snapshot import (generate_integrity_hash,
                                              generate_snapshot)

from .models import LotTraceability


@receiver(post_save, sender=ProductionOrder)
def create_traceability_record(sender, instance, **kwargs):
    # Solo actuamos si la orden se acaba de confirmar y NO tiene ya un registro
    if instance.status == instance.Status.CONFIRMED and not hasattr(instance, 'traceability_record'):
        
        # 1. Generamos el snapshot
        snapshot = generate_snapshot(instance)
        
        # 2. Generamos el hash
        integrity_hash = generate_integrity_hash(snapshot)
        
        # 3. Guardamos en el modelo de la app de trazabilidad
        LotTraceability.objects.create(
            production_order=instance,
            history_snapshot=snapshot,
            integrity_hash=integrity_hash
        )