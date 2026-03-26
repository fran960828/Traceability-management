import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.utils import timezone


@pytest.mark.django_db
def test_custom_user_creation_with_role(user_factory):
    """Verifica que el modelo de usuario guarda correctamente los campos de bodega"""
    user = user_factory(
        username="enologo_vlc",
        email="enologo@vlc.com",
        role="ENOLOGO",
        phone_number="123456",
    )
    assert user.role == "ENOLOGO"
    assert user.phone_number == "123456"
    assert str(user) == "enologo_vlc (Enólogo)"


@pytest.mark.django_db
def test_employee_id_generation_logic(user_factory):
    """Verifica que el ID de empleado sigue el formato EMP-YYYY-00X"""
    year = timezone.now().year

    user1 = user_factory(username="paco", password="password123")
    user2 = user_factory(username="pepe", password="password123")

    assert user1.employee_id == f"EMP-{year}-001"
    assert user2.employee_id == f"EMP-{year}-002"


@pytest.mark.django_db
def test_employee_id_is_unique(user_factory):
    """Verifica que no se puede repetir un employee_id (IntegrityError)"""
    user1 = user_factory(username="user1")

    # Intentamos crear otro usuario y forzamos manualmente el mismo ID
    # Esto debería saltar por el unique=True del modelo
    user2 = user_factory(username="user2")
    user2.employee_id = user1.employee_id

    with pytest.raises(IntegrityError):
        user2.save()


@pytest.mark.django_db
def test_user_creation_fails_without_username(user_factory):
    """Caso de error: Intentar crear un usuario sin username debe lanzar IntegrityError"""
    with pytest.raises(ValueError, match="The given username must be set"):
        user_factory(username=None, password="123")


@pytest.mark.django_db
def test_user_clean_validation(user_factory):
    """
    Caso de error: Django no valida la longitud o formato en el .save()
    pero sí en el .full_clean()
    """

    # Creamos un usuario con un rol que no existe en tus CHOICES
    user = user_factory(role="CAPITAN_DE_BARCO")

    with pytest.raises(ValidationError):
        # full_clean() es el método que lanza las validaciones de los campos
        user.full_clean()
