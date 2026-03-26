# Create your models here.
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class CustomUser(AbstractUser):
    class Roles(models.TextChoices):
        ADMIN = "ADMIN", "Administrador"
        ENOLOGO = "ENOLOGO", "Enólogo"
        BODEGUERO = "BODEGUERO", "Responsable de Bodega"
        COMPRAS = "COMPRAS", "Gestor de Compras"

    role = models.CharField(
        max_length=20, choices=Roles.choices, default=Roles.BODEGUERO
    )
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    employee_id = models.CharField(
        max_length=20, unique=True, blank=True, editable=False, null=True
    )

    # Usamos el email como campo principal para el login (más profesional)
    email = models.EmailField(unique=True)

    REQUIRED_FIELDS = ["email", "role"]  # Campos obligatorios al crear superuser

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    def save(self, *args, **kwargs):
        if not self.employee_id:
            # 1. Obtenemos el año actual
            year = timezone.now().year

            # 2. Buscamos el último ID generado para este año
            # Filtramos por los que empiecen por EMP-2026-
            last_emp = (
                CustomUser.objects.filter(employee_id__startswith=f"EMP-{year}-")
                .order_by("employee_id")
                .last()
            )

            if last_emp:
                # Extraemos el número (los últimos 3 dígitos), le sumamos 1
                last_number = int(last_emp.employee_id.split("-")[-1])
                new_number = last_number + 1
            else:
                # Si es el primero del año
                new_number = 1

            # 3. Formateamos a EMP-2026-001 (el :03d rellena con ceros a la izquierda)
            self.employee_id = f"EMP-{year}-{new_number:03d}"

        super().save(*args, **kwargs)
