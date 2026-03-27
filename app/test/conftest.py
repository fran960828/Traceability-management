import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

# --- FIXTURES DE AUTENTICACIÓN ---
User = get_user_model()

@pytest.fixture
def user_factory(db):
    """
    Si no tienes una UserFactory global, esta crea usuarios
    rápidamente para los tests.
    """

    def create_user(**kwargs):
        if "username" not in kwargs:
            kwargs["username"] = "testuser"
        if "role" not in kwargs:
            kwargs["role"] = "BODEGUERO"
        return User.objects.create_user(**kwargs)

    return create_user


@pytest.fixture
def api_client():
    """Cliente básico de DRF"""
    return APIClient()


@pytest.fixture
def auth_client(db, api_client, user_factory):
    """
    Cliente que ya viene logueado.
    Usa este para probar endpoints protegidos con IsAuthenticated.
    """
    user = user_factory(username="admin_test")
    api_client.force_authenticate(user=user)
    return api_client


