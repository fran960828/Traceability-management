import re

from django.core.exceptions import ValidationError
from django.db import models


class Location(models.Model):
    name = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Nombre de la Ubicación",
        help_text="Ej: ALMACEN_GENERAL, BODEGA_FINAL",
    )
    description = models.TextField(
        max_length=250, blank=True, verbose_name="Descripción técnica"
    )
    is_active = models.BooleanField(default=True, verbose_name="Estado Operativo")
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        """
        Validaciones personalizadas antes de guardar en la DB.
        """
        # 1. Normalización y validación del Nombre
        if self.name:
            # Quitamos espacios al principio y final
            self.name = self.name.strip().upper()
            # Reemplazamos espacios intermedios por guiones bajos para consistencia tipo ID
            self.name = re.sub(r"\s+", "_", self.name)

            # Validación: Solo permitimos caracteres alfanuméricos y guiones bajos
            if not re.match(r"^[A-Z0-9_ÁÉÍÓÚÜÑ]+$", self.name):
                raise ValidationError(
                    {
                        "name": "El nombre solo puede contener letras, números y guiones bajos (_)."
                    }
                )

        # 2. Limpieza de la Descripción
        if self.description:
            # Eliminamos espacios redundantes (deja solo uno entre palabras)
            self.description = " ".join(self.description.split())

    def save(self, *args, **kwargs):
        # Forzamos la ejecución de clean() antes de guardar
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        status = "ACTIVA" if self.is_active else "INACTIVA"
        return f"{self.name} ({status})"

    class Meta:
        verbose_name = "Ubicación"
        verbose_name_plural = "Ubicaciones"
        ordering = ["name"]
