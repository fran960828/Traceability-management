import datetime

from django.core.validators import EmailValidator
from django.db import models

from utils.validators import (clean_whitespace, phone_validator,
                              tax_id_validator)


class Category(models.Model):
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Nombre único de la categoría de suministro.",
    )

    class Meta:
        verbose_name = "Categoría"
        verbose_name_plural = "Categorías"
        ordering = ["name"]

    def save(self, *args, **kwargs):
        # Sanitización: Siempre en mayúsculas y sin espacios laterales
        self.name = self.name.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Supplier(models.Model):
    # 1. Identificación
    name = models.CharField(
        max_length=200, help_text="Nombre comercial o razón social completa."
    )
    tax_id = models.CharField(
        max_length=20,
        unique=True,
        validators=[tax_id_validator],
        help_text="Identificación fiscal única (NIF/CIF).",
    )
    supplier_code = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        db_index=True,  # Indexado para búsquedas rápidas de analistas
    )

    # 2. Clasificación
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="suppliers"
    )

    # 3. Contacto (Sanitizado)
    email_pedidos = models.EmailField(
        "email de pedidos",
        validators=[EmailValidator(message="Introduce un email corporativo válido.")],
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        validators=[phone_validator],
        help_text="Teléfono con prefijo internacional.",
    )
    address = models.TextField("dirección física", blank=True)
    lead_time = models.PositiveIntegerField(
        "días de entrega", default=7, help_text="Días promedio desde pedido a entrega."
    )

    # 4. Auditoría
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Proveedor"
        verbose_name_plural = "Proveedores"
        # Restricción a nivel de BD: No puede haber dos nombres iguales ignorando mayúsculas
        constraints = [
            models.UniqueConstraint(
                fields=["name"],
                name="unique_supplier_name_case_insensitive",
                violation_error_message="Ya existe un proveedor con este nombre.",
            )
        ]

    def clean(self):
        """Validación lógica antes de guardar"""
        # Forzamos que el tax_id esté siempre en mayúsculas
        if self.tax_id:
            self.tax_id = self.tax_id.strip().upper()
        if self.name:
            self.name = self.name.strip()

    def save(self, *args, **kwargs):
        if self.name:
            self.name = clean_whitespace(self.name)

        if self.tax_id:
            self.tax_id = self.tax_id.strip().upper()

        self.full_clean()  # Ejecuta los validadores antes de guardar en BD

        if not self.supplier_code:
            year = datetime.datetime.now().year
            last_supplier = Supplier.objects.filter(
                supplier_code__contains=f"PROV-{year}"
            ).last()

            if last_supplier:
                try:
                    last_number = int(last_supplier.supplier_code.split("-")[-1])
                    new_number = last_number + 1
                except (ValueError, IndexError):
                    new_number = 1
            else:
                new_number = 1
            self.supplier_code = f"PROV-{year}-{new_number:03d}"

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.supplier_code} | {self.name}"
