from django.db.models.signals import post_save
from django.dispatch import receiver

from purchase.models import PurchaseOrder

from .models import StockMovement


@receiver(post_save, sender=StockMovement)
def update_purchase_order_status(sender, instance, created, **kwargs):
    """
    Cuando se crea una entrada de stock (IN) vinculada a una PO,
    actualizamos las cantidades y el estado de la orden.
    """
    if created and instance.movement_type == "IN" and instance.reference_po:
        po = instance.reference_po
        order_item = instance.batch.order_item

        # 1. Actualizamos la cantidad recibida en la línea del pedido
        # Nota: Usamos F() en producción para evitar condiciones de carrera,
        # pero aquí lo hacemos simple para entender la lógica:
        order_item.quantity_received += instance.quantity
        order_item.save()

        # 2. Comprobar si toda la orden está completa
        # Miramos todas las líneas de esa PO
        all_items = po.items.all()
        total_ordered = sum(item.quantity_ordered for item in all_items)
        total_received = sum(item.quantity_received for item in all_items)

        if total_received >= total_ordered:
            po.status = PurchaseOrder.Status.CLOSED
        elif total_received > 0:
            po.status = PurchaseOrder.Status.PARTIAL

        po.save()
