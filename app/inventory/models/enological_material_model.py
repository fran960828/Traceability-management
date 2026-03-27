import datetime

from django.db import models

from utils.validators import clean_whitespace

from .base_material_model import AbstractBaseMaterialModel


class EnologicalMaterialModel(AbstractBaseMaterialModel):
    # Cambiamos el prefijo para identificar productos enológicos: ENO-2026-001
    CODE_PREFIX = "ENO"

    # Tipología específica para filtros y lógica enológica
    TYPE_CHOICES = [
        ("ESTABILIZANTE", "Estabilizantes (Goma Arábiga, Manoproteínas,antartika)"),
        ("CONSERVANTE", "Conservantes (Sulfitos, Ascórbico)"),
        ("ACIDIFICANTE", "Acidificantes y Correctores"),
    ]

    enological_type = models.CharField(
        max_length=20, choices=TYPE_CHOICES, verbose_name="Tipo de Producto"
    )

    # Formato comercial para saber cómo viene el envase original
    commercial_format = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Formato de Envase",
        help_text="Ej: Saco 25kg, Garrafa 20L, Sobre 500g",
    )

    class Meta:
        verbose_name = "Producto Enológico"
        verbose_name_plural = "Productos Enológicos"

    def save(self, *args, **kwargs):

        if self.commercial_format:
            self.commercial_format = clean_whitespace(self.commercial_format).upper()

        super().save(*args, **kwargs)

    def generate_internal_code(self):
        """Lógica de autoincremento específica para ENO"""
        year = datetime.datetime.now().year
        prefix = f"{self.CODE_PREFIX}-{year}-"

        last_item = (
            EnologicalMaterialModel.objects.filter(internal_code__startswith=prefix)
            .order_by("internal_code")
            .last()
        )

        if last_item:
            last_number = int(last_item.internal_code.split("-")[-1])
            new_number = last_number + 1
        else:
            new_number = 1

        return f"{prefix}{new_number:03d}"
