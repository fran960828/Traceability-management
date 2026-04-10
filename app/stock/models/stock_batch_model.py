from django.db import models

class Batch(models.Model):
    # El número de lote físico que viene en el palet/caja
    batch_number = models.CharField(
        max_length=50, 
        unique=True, 
        verbose_name="Número de Lote"
    )
    
    # El origen de este lote: una línea específica de un pedido
    order_item = models.ForeignKey(
        'purchase.PurchaseOrderItem', 
        on_delete=models.PROTECT, 
        related_name='batches',
        verbose_name="Línea de Pedido de Origen"
    )
    
    # Datos temporales necesarios para el stock
    arrival_date = models.DateField(
        auto_now_add=True, 
        verbose_name="Fecha de Entrada"
    )
    expiry_date = models.DateField(
        null=True, 
        blank=True, 
        verbose_name="Fecha de Caducidad"
    )

    @property
    def supplier(self):
        """Acceso directo al proveedor sin redundancia en DB"""
        return self.order_item.purchase_order.supplier

    @property
    def material_name(self):
        """Acceso al nombre del material (Packaging, Label o Enological)"""
        return self.order_item.material_name

    def clean(self):
        """Elimina espacios accidentales pero mantiene las mayúsculas/minúsculas."""
        if self.batch_number:
            self.batch_number = self.batch_number.strip().replace(" ", "")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Lote: {self.batch_number} | {self.material_name}"

    class Meta:
        verbose_name = "Lote"
        verbose_name_plural = "Lotes"
        ordering = ['-arrival_date']