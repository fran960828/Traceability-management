import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    """Devuelve una instancia limpia del cliente de pruebas de DRF"""
    return APIClient()


User = get_user_model()
_counter = 0  # Contador simple para que nada se repita


@pytest.fixture
def user_factory(db):
    def _make_user(
        username="DEFAULT",
        password="password123",
        role="BODEGUERO",
        phone_number=None,
        email=None,
    ):
        global _counter
        _counter += 1

        # 1. Si el usuario NO pasa nada (usa el DEFAULT), generamos uno automático
        if username == "DEFAULT":
            final_username = f"user_{_counter}"
        else:
            # 2. Si el usuario pasa algo (incluyendo None), respetamos lo que envíe
            final_username = username

        final_email = email or f"user_{_counter}@ontalba.es"

        return User.objects.create_user(
            username=final_username,
            password=password,
            role=role,
            email=final_email,
            phone_number=phone_number,
        )

    return _make_user


@pytest.fixture
def auth_client(api_client, user_factory):
    """
    Fixture de Cliente Autenticado:
    1. Crea un usuario usando tu factory (por defecto Bodeguero).
    2. Lo loguea en el cliente de la API.
    """
    # Ejecutamos la función user_factory para crear el objeto User
    user = user_factory(username="user_autenticado")

    # Forzamos la autenticación para que DRF reconozca al usuario en cada petición
    api_client.force_authenticate(user=user)

    return api_client
