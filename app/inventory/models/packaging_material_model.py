import datetime
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from utils.validators import clean_whitespace

from .base_material_model import AbstractBaseMaterialModel


class PackagingMaterialModel(AbstractBaseMaterialModel):
    # Sobrescribimos el prefijo para los códigos: PAC-2026-001
    CODE_PREFIX = "PAC"

    TYPE_CHOICES = [
        ("VIDRIO", "Vidrio (Botellas)"),
        ("BIB", "BAG IN BOX"),
        ("PLASTICO", "GARRAFA / PET"),
        ("CIERRE", "Cierres (Corchos/Tapones/Rosca)"),
        ("CAPSULA", "Cápsulas"),
        ("ETIQUETA", "Etiquetado (Frontal/Contra/Tirilla)"),
        ("EMBALAJE", "Embalaje Seco (Cajas/Separadores)"),
    ]

    packaging_type = models.CharField(
        max_length=20, choices=TYPE_CHOICES, verbose_name="Tipo de Material"
    )

    # Campo específico: capacidad para botellas o dimensiones para cajas
    specification = models.CharField(
        max_length=100,
        blank=True,
        help_text="Ej: 75cl, 1.5L, Caja 6 bot, Corcho 44x24mm",
        verbose_name="Especificación técnica",
    )

    # Color es crítico para vidrio y cápsulas
    color = models.CharField(
        max_length=50, blank=True,null=True, help_text="Solo para vidrio y botellas"
    )

    capacity = models.DecimalField(
        max_digits=5,
        decimal_places=3,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.001"))],
        help_text="Capacidad en litros. Solo para botellas, BIB, etc.",
    )

    class Meta:
        verbose_name = "Material de Acondicionamiento"
        verbose_name_plural = "Materiales de Acondicionamiento"

    def clean(self):
        # Evitamos la confusión: si no es un contenedor, la capacidad debe ser None
        if (
            self.packaging_type not in ["VIDRIO", "BIB", "GARRAFA"]
            and self.capacity is not None
        ):
            self.capacity = None
        if self.packaging_type not in ["VIDRIO", "CAPSULA"] and self.color is not None:
            self.color = None

    def save(self, *args, **kwargs):
        # 1. Sanitización de Color: Siempre MAYÚSCULAS y sin espacios extra
        if self.color:
            self.color = clean_whitespace(self.color).upper()

        # 2. Sanitización de Especificación: Limpiamos espacios
        if self.specification:
            self.specification = clean_whitespace(self.specification).upper()

        # Llamamos al save de la base (que generará el código y limpiará el nombre)
        super().save(*args, **kwargs)

    def generate_internal_code(self):
        """
        Lógica real de autoincremento para Packaging.
        Busca el último código PAC-YYYY-XXX y le suma 1.
        """

        year = datetime.datetime.now().year
        prefix = f"{self.CODE_PREFIX}-{year}-"

        last_item = (
            PackagingMaterialModel.objects.filter(internal_code__startswith=prefix)
            .order_by("internal_code")
            .last()
        )

        if last_item:
            last_number = int(last_item.internal_code.split("-")[-1])
            new_number = last_number + 1
        else:
            new_number = 1

        return f"{prefix}{new_number:03d}"
