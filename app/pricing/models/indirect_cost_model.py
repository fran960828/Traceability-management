from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class IndirectCostConfig(models.Model):
    name = models.CharField(max_length=100, help_text="Ej: Tasas Generales 2026")

    # Tasas por unidad producida (ej: por botella)
    labor_rate = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=0,
        validators=[
            MinValueValidator(Decimal("0.0000")),
            MaxValueValidator(Decimal("1.0000")),
        ],
    )
    energy_rate = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=0,
        validators=[
            MinValueValidator(Decimal("0.0000")),
            MaxValueValidator(Decimal("1.0000")),
        ],
    )
    amortization_rate = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=0,
        validators=[
            MinValueValidator(Decimal("0.0000"), MaxValueValidator(Decimal("1.0000")))
        ],
    )

    is_active = models.BooleanField(
        default=True, help_text="Solo puede haber una activa a la vez"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Lógica para asegurar que solo haya una configuración activa
        if self.is_active:
            IndirectCostConfig.objects.filter(is_active=True).exclude(
                pk=self.pk
            ).update(is_active=False)
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Configuración de Costos Indirectos"
