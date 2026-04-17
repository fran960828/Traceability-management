from decimal import ROUND_HALF_UP, Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class WineAnalysis(models.Model):

    production_order = models.ForeignKey(
        "production_record.ProductionOrder",
        on_delete=models.CASCADE,  # Si desaparece la orden, el análisis pierde su contexto
        related_name="analyses",
        verbose_name="Orden de Producción",
    )

    analysis_date = models.DateField(verbose_name="Fecha de Análisis")

    laboratory = models.CharField(
        max_length=100, blank=True, verbose_name="Laboratorio/Analista"
    )

    # --- Parámetros Analíticos ---

    alcohol_content = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("22.00")),
        ],
        verbose_name="Grado Alcohólico (% vol)",
    )

    volatile_acidity = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("2.00")),
        ],
        verbose_name="Acidez Volátil (g/L)",
    )

    total_acidity = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal("1.00")),
            MaxValueValidator(Decimal("15.00")),
        ],
        verbose_name="Acidez Total (g/L)",
    )

    ph = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal("2.50")),
            MaxValueValidator(Decimal("4.50")),
        ],
        verbose_name="pH",
    )

    reducing_sugars = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("300.00")),
        ],
        verbose_name="Azúcares Reductores (g/L)",
    )

    malic_acid = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("10.00")),
        ],
        verbose_name="Ácido Málico (g/L)",
    )

    lactic_acid = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("10.00")),
        ],
        verbose_name="Ácido Láctico (g/L)",
    )
    IC = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("50.00")),
        ],
        verbose_name="indice Colorante",
    )

    folin_index = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("150.00")),
        ],
        verbose_name="Índice de Folin (IPT)",
    )

    gluconic_acid = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("10.00")),
        ],
        verbose_name="Ácido Glucónico (g/L)",
    )

    # Metadatos
    observations = models.TextField(blank=True, verbose_name="Observaciones")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Análisis Enológico"
        verbose_name_plural = "Análisis Enológicos"
        ordering = ["-analysis_date", "-created_at"]

    @property
    def wine(self):
        return self.production_order.wine

    def __str__(self):
        return f"Análisis {self.wine.name} - {self.analysis_date}"

    def save(self, *args, **kwargs):
        # Lista de campos decimales que quieres auto-redondear a 2 decimales
        decimal_fields = [
            "alcohol_content",
            "volatile_acidity",
            "total_acidity",
            "ph",
            "reducing_sugars",
            "IC",
            "folin_index",
            "malic_acid",
            "lactic_acid",
            "gluconic_acid",
        ]

        for field in decimal_fields:
            value = getattr(self, field)
            if value is not None:
                # Redondea a 2 decimales exactos
                setattr(
                    self, field, value.quantize(Decimal("0.00"), rounding=ROUND_HALF_UP)
                )

        self.full_clean()
        super().save(*args, **kwargs)
