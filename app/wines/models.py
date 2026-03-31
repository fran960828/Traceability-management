from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from inventory.models.label_material_model import LabelMaterialModel
from inventory.models.packaging_material_model import PackagingMaterialModel


class WineModel(models.Model):
    # --- CHOICES ---
    APPELLATION_CHOICES = [
        ("DOP", "DENOMINACIÓN DE ORIGEN PROTEGIDA"),
        ("DOCa", "DENOMINACIÓN DE ORIGEN CALIFICADA"),
        ("VP", "VINO DE PAGO"),
        ("VC", "VINO DE CALIDAD CON INDICACIÓN GEOGRÁFICA"),
        ("IGP", "INDICACIÓN GEOGRÁFICA PROTEGIDA (VINO DE LA TIERRA)"),
        ("MESA", "VINO DE MESA"),
    ]

    WINE_TYPE_CHOICES = [
        ("BLANCO", "BLANCO"),
        ("TINTO", "TINTO"),
        ("ROSADO", "ROSADO"),
        ("ESPUMOSO", "ESPUMOSO"),
        ("GENEROSO", "GENEROSO"),
    ]

    AGING_CHOICES = [
        ("JOVEN", "JOVEN / SIN CRIANZA"),
        ("ROBLE", "ROBLE"),
        ("CRIANZA", "CRIANZA"),
        ("RESERVA", "RESERVA"),
        ("GRAN_RESERVA", "GRAN RESERVA"),
    ]

    # --- IDENTIFICACIÓN ---
    name = models.CharField(max_length=100)
    vintage = models.PositiveIntegerField(
        validators=[MinValueValidator(1900), MaxValueValidator(2100)]
    )
    internal_code = models.CharField(max_length=20, unique=True, editable=False)
    is_active = models.BooleanField(default=True)

    # --- CLASIFICACIÓN ---
    appellation_type = models.CharField(max_length=5, choices=APPELLATION_CHOICES)
    appellation_name = models.CharField(max_length=100)
    wine_type = models.CharField(max_length=20, choices=WINE_TYPE_CHOICES)
    aging_category = models.CharField(max_length=20, choices=AGING_CHOICES)
    varietals = models.TextField()
    alcohol_percentage = models.DecimalField(max_digits=4, decimal_places=2)

    # --- ESCANDALLO (Contenedor flexible: Vidrio, BIB o Plástico) ---
    default_container = models.ForeignKey(
        PackagingMaterialModel,
        related_name="wine_containers",
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={"packaging_type__in": ["VIDRIO", "BIB", "PLASTICO"]},
        verbose_name="Envase Principal",
    )
    default_cork = models.ForeignKey(
        PackagingMaterialModel,
        related_name="wine_closures",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={"packaging_type": "CIERRE"},
        verbose_name="Cierre/Tapón",
    )
    default_front_label = models.ForeignKey(
        LabelMaterialModel,
        related_name="wine_front_labels",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={"label_type": "FRONTAL"},
    )
    default_back_label = models.ForeignKey(
        LabelMaterialModel,
        related_name="wine_back_labels",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={"label_type": "CONTRA"},
    )
    default_dop_seal = models.ForeignKey(
        LabelMaterialModel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={
            "label_type": "TIRILLA"
        },  # Deberás añadir 'TIRILLA' a los CHOICES de LabelMaterialModel
        verbose_name="Precinto / Tirilla DOP",
        related_name="wines_as_seal",
    )

    class Meta:
        ordering = ["-vintage", "name"]
        unique_together = ["name", "vintage"]

    def clean(self):
        """Validaciones de integridad de negocio"""
        super().clean()
        errors = {}

        # 1. Validación de Tirilla para DOP/DOCa
        if self.appellation_type in ["DOP", "DOCa"] and not self.default_dop_seal:
            errors["default_dop_seal"] = (
                f"Un vino con mención {self.get_appellation_type_display()} "
                "debe tener asignado un Precinto/Tirilla de garantía."
            )

        # 2. Validación de Corcho para Vidrio
        if self.default_container and self.default_container.packaging_type == "VIDRIO":
            if not self.default_cork:
                errors["default_cork"] = (
                    "Las botellas de vidrio requieren un tipo de cierre (corcho/tapón)."
                )

        # 3. VALIDACIÓN QUE FALTABA: Mismatch de Añada
        # Validamos la frontal
        if (
            self.default_front_label
            and self.default_front_label.vintage != self.vintage
        ):
            errors["default_front_label"] = (
                f"La etiqueta frontal es de {self.default_front_label.vintage}, "
                f"pero el vino es de {self.vintage}."
            )

        # Validamos la contra (opcional, pero profesional)
        if self.default_back_label and self.default_back_label.vintage != self.vintage:
            errors["default_back_label"] = "La añada de la contraetiqueta no coincide."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # 1. Forzamos la ejecución de clean()
        self.full_clean()

        # 2. Sanitización
        self.name = self.name.strip().upper()
        self.appellation_name = self.appellation_name.strip().upper()
        self.wine_type = self.wine_type.upper()
        self.aging_category = self.aging_category.upper()

        # 3. Generación de código
        if not self.internal_code:
            last_wine = (
                WineModel.objects.filter(vintage=self.vintage).order_by("id").last()
            )
            new_number = (
                1 if not last_wine else int(last_wine.internal_code.split("-")[-1]) + 1
            )
            # Cambié WN por BRD para ser consistente con tus tests anteriores, o usa el que prefieras
            self.internal_code = f"WN-{self.vintage}-{new_number:03d}"

        super().save(*args, **kwargs)
