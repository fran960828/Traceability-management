from django.db import models
from django.db.models import Sum


class Batch(models.Model):
    class StockStatus(models.TextChoices):
        AVAILABLE = "AVAILABLE", "En Existencias"
        DEPLETED = "DEPLETED", "Agotado"
    # El número de lote físico que viene en el palet/caja
    batch_number = models.CharField(
        max_length=50, verbose_name="Número de Lote"
    )

    # El origen de este lote: una línea específica de un pedido
    order_item = models.ForeignKey(
        "purchase.PurchaseOrderItem",
        on_delete=models.PROTECT,
        related_name="batches",
        verbose_name="Línea de Pedido de Origen",
    )

    # Datos temporales necesarios para el stock
    arrival_date = models.DateField(auto_now_add=True, verbose_name="Fecha de Entrada")
    expiry_date = models.DateField(
        null=True, blank=True, verbose_name="Fecha de Caducidad"
    )
    current_stock_cache = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=0.000,
        verbose_name="Existencias Vivas (Caché)"
    )
    stock_status = models.CharField(
        max_length=50,
        choices=StockStatus.choices,
        default=StockStatus.AVAILABLE,
        db_index=True,  # 🔥 Indexado para búsquedas ultra rápidas
        verbose_name="Estado Operativo"
    )

    @property
    def supplier(self):
        """Acceso directo al proveedor sin redundancia en DB"""
        return self.order_item.purchase_order.supplier

    @property
    def material_name(self):
        """Acceso al nombre del material (Packaging, Label o Enological)"""
        return self.order_item.material_name

    @property
    def current_stock(self):
        """Calcula el stock actual sumando todos los movimientos de este lote."""
        return self.movements.aggregate(total=Sum("quantity"))["total"] or 0
    
    def update_availability_status(self):
        """
        Calcula algebraicamente el saldo real actual y asienta el flag
        de 'Agotado' de forma persistente.
        """
        
        self.current_stock_cache = self.current_stock
        
        # 🔒 REGLA DE NEGOCIO: Si no queda stock, el lote pasa a estar DEPLETED
        if self.current_stock_cache <= 0:
            self.stock_status = self.StockStatus.DEPLETED
        else:
            self.stock_status = self.StockStatus.AVAILABLE
            
        # Guardamos únicamente estas dos columnas para no disparar cleans innecesarios
        self.save(update_fields=["current_stock_cache", "stock_status"])

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
        ordering = ["-arrival_date"]
