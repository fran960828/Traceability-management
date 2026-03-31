from django.contrib import admin

from .models import WineModel


@admin.register(WineModel)
class WineAdmin(admin.ModelAdmin):
    # 1. Columnas que se ven en la lista principal
    list_display = (
        "internal_code",
        "name",
        "vintage",
        "appellation_type",
        "wine_type",
        "is_active",
    )

    # 2. Filtros laterales para navegar rápido
    list_filter = ("vintage", "appellation_type", "wine_type", "is_active")

    # 3. Buscador por nombre y código interno
    search_fields = ("name", "internal_code", "appellation_name")

    # 4. Campo de solo lectura (porque se genera en el save)
    readonly_fields = ("internal_code",)

    # 5. Organización del formulario por secciones (Fieldsets)
    fieldsets = (
        (
            "Información Básica",
            {"fields": ("internal_code", "name", "vintage", "is_active")},
        ),
        (
            "Clasificación Enológica",
            {
                "fields": (
                    "appellation_type",
                    "appellation_name",
                    "wine_type",
                    "aging_category",
                    "varietals",
                    "alcohol_percentage",
                )
            },
        ),
        (
            "Escandallo por Defecto (Materiales)",
            {
                "description": "Materiales que se cargarán automáticamente en las órdenes de embotellado.",
                "fields": (
                    "default_container",
                    "default_cork",
                    "default_front_label",
                    "default_back_label",
                    "default_dop_seal",
                ),
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        """
        Forzamos el full_clean() también en el Admin para que
        las reglas de negocio (añada, corchos, etc.) se validen aquí.
        """
        obj.full_clean()
        super().save_model(request, obj, form, change)


# Register your models here.
