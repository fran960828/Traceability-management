from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class StockMovement(models.Model):
    class MovementType(models.TextChoices):
        IN = "IN", "Entrada (Compra/Producción)"
        OUT = "OUT", "Salida (Venta/Uso)"
        ADJUSTMENT = "ADJ", "Ajuste de Inventario"
        TRANSFER = "TRA", "Transferencia entre ubicaciones"

    batch = models.ForeignKey(
        "stock.Batch", on_delete=models.CASCADE, related_name="movements"
    )
    location = models.ForeignKey(
        "stock.Location", on_delete=models.PROTECT, related_name="movements"
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=3,  # 3 decimales permiten precisión de gramos (0.001 kg)
        help_text="Positivo para entradas, negativo para salidas.",
    )
    movement_type = models.CharField(max_length=3, choices=MovementType.choices)

    # Trazabilidad
    reference_po = models.ForeignKey(
        "purchase.PurchaseOrder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Orden de Compra Relacionada",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        verbose_name="Usuario responsable",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, help_text="Razón del movimiento o ajuste.")

    def clean(self):
        """
        Validaciones de integridad lógica para evitar errores de almacén.
        """
        # 1. Validación de cantidad cero
        if self.quantity == 0:
            raise ValidationError(
                {"quantity": "La cantidad del movimiento no puede ser cero."}
            )

        # 2. Consistencia entre Tipo y Signo
        if self.movement_type == self.MovementType.IN and self.quantity < 0:
            raise ValidationError(
                {
                    "quantity": "Un movimiento de ENTRADA IN debe tener cantidad positiva."
                }
            )

        if self.movement_type == self.MovementType.OUT and self.quantity > 0:
            raise ValidationError(
                {
                    "quantity": "Un movimiento de SALIDA OUT debe tener cantidad negativa."
                }
            )

        # 3. Limpieza de notas
        if self.notes:
            self.notes = " ".join(self.notes.split())

    def save(self, *args, **kwargs):
        # Bloqueo de edición: Si ya existe en DB, no permitimos modificarlo.
        # En stock profesional, los errores se arreglan con un nuevo movimiento corrector.
        if self.pk:
            raise ValidationError(
                "Los movimientos de stock son inmutables. Crea uno nuevo para corregir."
            )

        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.movement_type} | {self.quantity} uds | Lote: {self.batch.batch_number}"

    class Meta:
        verbose_name = "Movimiento de Stock"
        verbose_name_plural = "Movimientos de Stock"
        ordering = ["-created_at"]
