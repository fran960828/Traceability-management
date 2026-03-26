import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


@pytest.mark.django_db
class TestAuthentication:
    def test_user_can_login_with_valid_credentials(self, client):
        """Verifica que un usuario real recibe tokens y claims personalizados"""
        User.objects.create_user(
            username="enologo1", password="password123", role="ENOLOGO"
        )
        url = reverse("client:token_obtain_pair")
        payload = {"username": "enologo1", "password": "password123"}

        response = client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data
        # Verificamos que nuestro Custom Serializer funciona
        access_token_str = response.data["access"]

        # 2. Lo decodificamos
        access_token = AccessToken(access_token_str)

        # 3. Verificamos que el payload contiene el rol
        assert access_token["role"] == "ENOLOGO"

    def test_user_can_refresh_token(self, client):
        """Verifica que el refresh_token genera un nuevo access_token con claims"""
        User.objects.create_user(
            username="bodeguero1", password="password123", role="BODEGUERO"
        )
        login_url = reverse("client:token_obtain_pair")
        refresh_url = reverse("client:token_refresh")

        # 1. Login para obtener el refresh
        login_res = client.post(
            login_url, {"username": "bodeguero1", "password": "password123"}
        )
        refresh_token = login_res.data["refresh"]

        # 2. Pedir nuevo access
        response = client.post(refresh_url, {"refresh": refresh_token}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        # El refresh personalizado también debería devolver el role si lo configuramos
        assert response.data.get("role") == "BODEGUERO"

    # --- EDGE CASES / ERROR HANDLING ---

    def test_login_fails_with_wrong_password(self, client):
        """Caso: Usuario existe pero la contraseña es incorrecta"""
        User.objects.create_user(username="admin", password="password123")
        url = reverse("client:token_obtain_pair")

        response = client.post(url, {"username": "admin", "password": "wrongpassword"})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "access" not in response.data

    def test_login_fails_with_missing_fields(self, client):
        """Caso: Se envía el formulario incompleto"""
        url = reverse("client:token_obtain_pair")

        # Enviamos solo el username
        response = client.post(url, {"username": "admin"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password" in response.data  # DRF indica qué campo falta

    def test_refresh_fails_with_invalid_token(self, client):
        """Caso: Se intenta refrescar con un token corrupto o inventado"""
        url = reverse("client:token_refresh")

        response = client.post(
            url, {"refresh": "token_inventado_totalmente_falso"}, format="json"
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["code"] == "token_not_valid"

    def test_inactive_user_cannot_login(self, client):
        """Caso: Usuario desactivado (ej: ex-empleado) no debe entrar"""
        User.objects.create_user(
            username="ex_empleado", password="password123", is_active=False
        )
        url = reverse("client:token_obtain_pair")

        response = client.post(
            url, {"username": "ex_empleado", "password": "password123"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
