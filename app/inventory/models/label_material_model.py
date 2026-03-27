import datetime

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from utils.validators import clean_whitespace

from .base_material_model import AbstractBaseMaterialModel


class LabelMaterialModel(AbstractBaseMaterialModel):
    CODE_PREFIX = "ETI"

    TYPE_CHOICES = [
        ("FRONTAL", "Etiqueta Frontal"),
        ("CONTRA", "Contraetiqueta"),
        ("COLLARIN", "Collarín/Cápsula de papel"),
        ("TIRILLA", "Precinto de Garantía / Tirilla D.O."),
        ("MEDALLA", "Adhesivo Medalla/Premios"),
    ]

    label_type = models.CharField(
        max_length=20, choices=TYPE_CHOICES, verbose_name="Tipo de Etiqueta"
    )

    # El campo que controlarás con el Enum en el Frontend
    brand_reference = models.CharField(
        max_length=100,
        verbose_name="Marca de la Bodega",
        help_text="Ej: Reserva de la Familia, Crianza, Blanco Joven",
    )

    # Nuevo campo para la Añada
    vintage = models.PositiveIntegerField(
        verbose_name="Añada",
        validators=[MinValueValidator(1900), MaxValueValidator(2100)],
        help_text="Año de la cosecha ",
    )

    class Meta:
        verbose_name = "Etiqueta/Contra"
        verbose_name_plural = "Etiquetas y Contras"

    def save(self, *args, **kwargs):

        if self.label_type:
            self.label_type = clean_whitespace(self.label_type).upper()

        if self.brand_reference:
            self.brand_reference = clean_whitespace(self.brand_reference).upper()

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.internal_code} | {self.brand_reference}{self.vintage}"

    def generate_internal_code(self):

        year_now = datetime.datetime.now().year
        prefix = f"{self.CODE_PREFIX}-{year_now}-"
        last_item = (
            LabelMaterialModel.objects.filter(internal_code__startswith=prefix)
            .order_by("internal_code")
            .last()
        )
        if last_item:
            last_number = int(last_item.internal_code.split("-")[-1])
            new_number = last_number + 1
        else:
            new_number = 1
        return f"{prefix}{new_number:03d}"
