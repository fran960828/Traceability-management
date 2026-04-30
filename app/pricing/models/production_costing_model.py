from decimal import Decimal

from django.db import models


class ProductionCosting(models.Model):
    production_order = models.OneToOneField(
        "production_record.ProductionOrder",
        on_delete=models.CASCADE,
        related_name="costing_record",
    )

    # --- COSTOS DIRECTOS (SNAPSHOT JSON) ---
    # Guardamos: vino, botellas, corchos, etiquetas... con su PRECIO DE COMPRA real
    materials_snapshot = models.JSONField()

    # --- COSTOS INDIRECTOS (VALORES FIJOS EN EL MOMENTO) ---
    # Guardamos el valor calculado, no la tasa, para que sea histórico
    labor_total = models.DecimalField(max_digits=12, decimal_places=4)
    energy_total = models.DecimalField(max_digits=12, decimal_places=4)
    amortization_total = models.DecimalField(max_digits=12, decimal_places=4)

    # --- RESULTADOS FINALES ---
    total_material_cost = models.DecimalField(max_digits=12, decimal_places=4)
    total_indirect_cost = models.DecimalField(max_digits=12, decimal_places=4)

    grand_total = models.DecimalField(max_digits=12, decimal_places=4)
    unit_cost = models.DecimalField(
        max_digits=12, decimal_places=4, help_text="Costo total / unidades producidas"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Escandallo de Producción"

    