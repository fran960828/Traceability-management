from django.core.validators import MinValueValidator
from django.db import models

from .production_order_model import ProductionOrder


class ProductionEnologicalItem(models.Model):
    production_order = models.ForeignKey(
        ProductionOrder, on_delete=models.CASCADE, related_name="enological_materials"
    )
    material = models.ForeignKey(
        "inventory.EnologicalMaterialModel",
        on_delete=models.PROTECT,
        verbose_name="Producto Enológico",
    )
    quantity_used = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        validators=[MinValueValidator(0.001)],
        help_text="Cantidad total usada en todo el lote de producción",
    )

    class Meta:
        verbose_name = "Insumo Enológico Usado"
        unique_together = (
            "production_order",
            "material",
        )  # Evita duplicar el mismo producto en el mismo parte

    def __str__(self):
        return f"{self.material.name}: {self.quantity_used}"
