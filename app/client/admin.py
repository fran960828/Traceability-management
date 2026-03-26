from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from client.models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    # Campos que se muestran en la lista principal del admin
    list_display = ("username", "email", "role", "is_staff", "is_active")

    # Filtros laterales para segmentar usuarios rápidamente
    list_filter = ("role", "is_staff", "is_active")

    # Configuración de los formularios de edición
    # Fieldsets organiza los campos en secciones visuales
    fieldsets = UserAdmin.fieldsets + (
        ("Información de Bodega", {"fields": ("role", "phone_number", "employee_id")}),
    )

    # Configuración del formulario de creación de nuevo usuario
    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "Información de Bodega",
            {"fields": ("email", "role", "phone_number", "employee_id")},
        ),
    )

    # Permite buscar por estos campos
    search_fields = ("username", "email", "employee_id")
    ordering = ("username",)
