from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from inventory.models import (
    EnologicalMaterialModel,
    LabelMaterialModel,
    PackagingMaterialModel,
)

from .purchase_order_model import PurchaseOrder


class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(
        PurchaseOrder, related_name="items", on_delete=models.CASCADE
    )

    # LAS TRES LLAVES MAESTRAS
    # Solo una de estas tres estará llena por cada fila
    packaging = models.ForeignKey(
        PackagingMaterialModel,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="packaging_items",
    )
    label = models.ForeignKey(
        LabelMaterialModel,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="label_items",
    )
    enological = models.ForeignKey(
        EnologicalMaterialModel,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="enological_items",
    )

    quantity_ordered = models.PositiveIntegerField()
    quantity_received = models.PositiveIntegerField(default=0)
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        validators=[MinValueValidator(Decimal(0.0001))],
        verbose_name="precio unitario",
    )

    def clean(self):
        if hasattr(self, "purchase_order") and self.purchase_order:
            if self.purchase_order.status == PurchaseOrder.Status.CLOSED:
                raise ValidationError(
                    "No se puede modificar una línea de una orden cerrada."
                )

        """Validación de 'Solo uno' para asegurar integridad"""
        fields = [self.packaging, self.label, self.enological]
        count = sum(1 for field in fields if field is not None)

        if count == 0:
            raise ValidationError(
                "Debe seleccionar un producto (Packaging, Etiqueta o Enológico)."
            )
        if count > 1:
            raise ValidationError(
                "Una línea de pedido solo puede contener un tipo de producto."
            )

    def delete(self, *args, **kwargs):
        # BLOQUEO DE ELIMINACIÓN DE LÍNEA SI LA ORDEN ESTÁ CERRADA
        if self.purchase_order.status == PurchaseOrder.Status.CLOSED:
            raise ValidationError(
                "No se puede eliminar una línea de una orden cerrada."
            )
        super().delete(*args, **kwargs)

    @property
    def material_name(self):
        """Retorna el nombre del material sin importar el tipo"""
        obj = self.packaging or self.label or self.enological
        return obj.name if obj else "Desconocido"

    def __str__(self):
        return f"{self.quantity_ordered} x {self.material_name}"
