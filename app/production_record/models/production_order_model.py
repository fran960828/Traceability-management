from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models, transaction

from production_record.utils import validate_production_volume_integrity
from stock.services import FIFOService


class ProductionOrder(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Borrador"
        CONFIRMED = "CONFIRMED", "Confirmado (Stock descontado)"
        CANCELLED = "CANCELLED", "Cancelado"

    # --- RELACIONES ---
    wine = models.ForeignKey(
        "wines.WineModel",
        on_delete=models.PROTECT,
        related_name="production_orders",
        verbose_name="Vino a Embotellar",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, verbose_name="Responsable"
    )

    # --- DATOS DE PRODUCCIÓN ---
    production_date = models.DateField(verbose_name="Fecha de Embotellado")
    quantity_produced = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Cantidad total de unidades finalizadas (botellas, BIB, etc.)",
    )
    lot_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Lote de Producto Terminado",
        help_text="Código de lote impreso en el envase (ej: L24-001)",
    )

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT
    )

    bulk_liters_withdrawn = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        verbose_name="Litros extraídos de depósito",
        help_text="Cantidad real de vino líquido que salió del depósito según caudalímetro.",
    )
    # --- TRAZABILIDAD ---
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Parte de Embotellado"
        verbose_name_plural = "Partes de Embotellado"
        ordering = ["-production_date", "-created_at"]

    @property
    def total_liters(self):
        """
        Calcula el volumen total de vino procesado.
        """
        # Intentamos obtener el envase especial, si no, el del vino
        container = self.wine.default_container

        if container and container.capacity:
            # Cálculo: 1000 botellas * 0.75 L = 750.000 L
            volume = self.quantity_produced * container.capacity
            return volume.quantize(Decimal("0.001"))

        return Decimal("0.000")

    @property
    def loss_liters(self):
        """Diferencia entre lo que salió y lo que se embotelló teóricamente"""
        # total_liters es tu property que calcula (cantidad * capacidad)
        return self.bulk_liters_withdrawn - self.total_liters

    @property
    def loss_percentage(self):
        """Porcentaje de merma sobre el total extraído"""
        if self.bulk_liters_withdrawn and self.bulk_liters_withdrawn > 0:
            # Convertimos el resultado final a Decimal para evitar el error de float
            percentage = (self.loss_liters / self.bulk_liters_withdrawn) * Decimal("100")
            return percentage.quantize(Decimal("0.01")) # Porcentaje con 2 decimales
        return Decimal("0.00")
    
    def _check_immutability(self):
        """Valida que no se alteren datos críticos en órdenes confirmadas"""
        if self.pk and self.status == self.Status.CONFIRMED:
            original = self.__class__.objects.get(pk=self.pk)
            
            if original.quantity_produced != self.quantity_produced:
                raise ValidationError(
                    "No se puede modificar la cantidad de una orden confirmada.")

    def clean(self):
        """Validaciones de robustez antes de guardar"""
        self._check_immutability()
        validate_production_volume_integrity(
            total_liters=self.total_liters,
            bulk_liters_withdrawn=self.bulk_liters_withdrawn
        )

    def __str__(self):
        return f"{self.lot_number} | {self.wine.name} ({self.quantity_produced} uds)"

    def _get_recipe_items(self):
        """Encapsula qué materiales fijos deben descontarse."""
        recipe = self.wine
        return [
            (recipe.default_container, self.quantity_produced, "Envase"),
            (recipe.default_cork, self.quantity_produced, "Cierre"),
            (recipe.default_capsule, self.quantity_produced, "Cápsula"),
            (recipe.default_front_label, self.quantity_produced, "Etiqueta Frontal"),
            (recipe.default_back_label, self.quantity_produced, "Contraetiqueta"),
            (recipe.default_dop_seal, self.quantity_produced, "Tirilla DOP"),
        ]

    @transaction.atomic
    def confirm_production(self):
        if self.status != self.Status.DRAFT:
            raise ValidationError("La orden ya está confirmada.")

        # 1. Consumir materiales de la receta
        for material, qty, label in self._get_recipe_items():
            if material:
                FIFOService.consume_material(
                    material, qty, self.user, f"Prod: {self.lot_number} ({label})"
                )

        # 2. Consumir materiales enológicos manuales
        for item in self.enological_materials.filter(quantity_used__gt=0):
            FIFOService.consume_material(
                item.material,
                item.quantity_used,
                self.user,
                f"Prod: {self.lot_number} (Enológico)",
            )

        self.status = self.Status.CONFIRMED
        self.save()
