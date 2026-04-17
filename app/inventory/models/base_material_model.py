import datetime

from django.db import models
from django.db.models import Sum

from stock.models import StockMovement
from utils.validators import clean_whitespace


class AbstractBaseMaterialModel(models.Model):
    CODE_PREFIX = "MAT"
    # Identificadores
    name = models.CharField(max_length=150, verbose_name="Nombre del Material")
    internal_code = models.CharField(
        max_length=50, unique=True, editable=False, verbose_name="Código Interno"
    )

    # Relaciones
    supplier = models.ForeignKey(
        "supplier.Supplier",
        on_delete=models.PROTECT,  # No permite borrar un proveedor si tiene materiales
        related_name="%(class)s_materials",  # Evita colisiones en la herencia
        verbose_name="Proveedor Habitual",
    )

    # Configuración de Inventario (Parámetros fijos)
    UNIT_CHOICES = [
        ("UNIDAD", "Unidades"),
        ("KG", "Kilogramos"),
        ("LITRO", "Litros"),
        ("MILLAR", "Millares"),
    ]
    unit_mesure = models.CharField(
        max_length=10,
        choices=UNIT_CHOICES,
        default="UNIDAD",
        verbose_name="Unidad de Medida",
    )
    min_stock_level = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Stock Mínimo de Seguridad",
    )

    # Control de Estado
    is_active = models.BooleanField(default=True, verbose_name="¿Está activo?")
    description = models.TextField(
        blank=True, null=True, verbose_name="Descripción Técnica"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True  # Crucial: No crea tabla propia
        app_label = "inventory"

    def __str__(self):
        return f"{self.internal_code} | {self.name}"

    def save(self, *args, **kwargs):
        # Sanitización de nombre (Nuestro estándar de calidad)
        if self.name:
            self.name = clean_whitespace(self.name).upper()

        # Generación de código interno (ej: MAT-2026-001)
        # Podremos personalizar este prefijo en las clases hijas
        if not self.internal_code:
            self.internal_code = self.generate_internal_code()

        super().save(*args, **kwargs)

    def generate_internal_code(self):
        """
        Lógica de autoincremento.
        Busca el último código que empiece por el prefijo de la clase hija.
        """
        year = datetime.datetime.now().year
        prefix = f"{self.CODE_PREFIX}-{year}-"

        return f"{prefix}000"

    @property
    def current_stock(self):

        # 1. Identificamos qué tipo de material es este objeto
        model_name = self._meta.model_name  # ej: 'labelmaterialmodel'

        # 2. Mapeamos el nombre del modelo al nombre del campo en PurchaseOrderItem
        # REVISA: Estos nombres deben ser EXACTOS a como definiste las FKs en PurchaseOrderItem
        field_mapping = {
            "labelmaterialmodel": "label",
            "packagingmaterialmodel": "packaging",
            "enologicalmaterialmodel": "enological",
        }

        target_field = field_mapping.get(model_name)

        if not target_field:
            return 0

        # 3. EL FILTRO CORRECTO:
        # Entramos hasta el campo del material dentro del item de compra
        filter_kwargs = {f"batch__order_item__{target_field}": self}

        return (
            StockMovement.objects.filter(**filter_kwargs).aggregate(
                total=Sum("quantity")
            )["total"]
            or 0
        )

    @property
    def is_low_stock(self):
        """Compara el stock actual con el mínimo si existe."""
        if self.min_stock_level == 0:
            return False
        return self.current_stock < self.min_stock_level
