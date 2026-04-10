from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from supplier.models import Supplier  # Importamos tus proveedores


class PurchaseOrder(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", _("Borrador")  # Aún se puede editar
        OPEN = "OPEN", _("Abierta")  # Enviada al proveedor, esperando material
        PARTIAL = "PARTIAL", _("Recibida Parcial")  # Ha llegado algo, pero no todo
        CLOSED = "CLOSED", _("Cerrada")  # Todo recibido correctamente
        CANCELLED = "CANCELLED", _("Cancelada")

    # Código único (ej: PO-2026-001)
    order_number = models.CharField(max_length=20, unique=True, editable=False)
    supplier = models.ForeignKey(
        Supplier, on_delete=models.PROTECT, related_name="purchase_orders"
    )

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT
    )

    date_issued = models.DateTimeField(auto_now_add=True)
    date_delivery_expected = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    def clean(self):
        # 1. COMPROBAR SI EL OBJETO YA EXISTE EN LA BASE DE DATOS
        if self.pk:
            # Traemos la versión "congelada" de la base de datos para comparar
            old_order = PurchaseOrder.objects.get(pk=self.pk)

            # 2. SI YA ESTABA CERRADA, BLOQUEO TOTAL
            if old_order.status == self.Status.CLOSED:
                raise ValidationError(
                    "Esta orden está CERRADA. No se permite ninguna modificación."
                )

            # 3. VALIDACIÓN DE CAMBIO DE ESTADO (Opcional pero Pro)
            # Evita que una orden CANCELADA pase a CERRADA, por ejemplo.
            if (
                old_order.status == self.Status.CANCELLED
                and self.status != self.Status.CANCELLED
            ):
                raise ValidationError(
                    "No se puede reactivar una orden que ha sido cancelada."
                )

    def delete(self, *args, **kwargs):
        if self.status == self.Status.CLOSED:
            raise ValidationError("No se puede eliminar una orden que ya está cerrada.")
        super().delete(*args, **kwargs)

    def __str__(self):
        return f"{self.order_number} - {self.supplier.name}"

    def save(self, *args, **kwargs):
        # Lógica para autogenerar el código PO-2026-XXX
        if not self.order_number:
            last_po = PurchaseOrder.objects.all().order_by("id").last()
            next_id = (last_po.id + 1) if last_po else 1
            self.order_number = (
                f"PO-{self.date_issued.year if self.id else 2026}-{next_id:04d}"
            )

        super().save(*args, **kwargs)
