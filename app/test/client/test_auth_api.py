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
    # --- LOGOUT TESTS ---

    def test_user_can_logout_successfully(self, api_client, user_factory):
        """
        Verifica que el refresh token se invalida correctamente.
        Usamos api_client (limpio) en lugar de auth_client porque necesitamos 
        hacer el flujo de login real para obtener los tokens físicos.
        """
        # 1. Setup: Crear usuario y obtener URLs
        user_factory(username="enologo_logout", password="password123")
        login_url = reverse("client:token_obtain_pair")
        logout_url = reverse("client:auth_logout")
        refresh_url = reverse("client:token_refresh")

        # 2. Login Real: Necesitamos los tokens generados por el Serializer
        login_res = api_client.post(login_url, {
            "username": "enologo_logout", 
            "password": "password123"
        }, format="json")
        
        access_token = login_res.data["access"]
        refresh_token = login_res.data["refresh"]

        # 3. Logout: Autorizamos con el access y enviamos el refresh al blacklist
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = api_client.post(logout_url, {"refresh": refresh_token}, format="json")

        assert response.status_code == status.HTTP_205_RESET_CONTENT
        assert response.data["detail"] == "La sesión ha sido cerrada correctamente."

        # 4. Verificación de Blacklist: 
        # Limpiamos credenciales para asegurar que el fallo es por el token y no por la sesión del cliente
        api_client.credentials() 
        
        # Intentamos refrescar con el token que acabamos de invalidar
        refresh_res = api_client.post(refresh_url, {"refresh": refresh_token}, format="json")
        
        assert refresh_res.status_code == status.HTTP_401_UNAUTHORIZED
        assert refresh_res.data["code"] == "token_not_valid"

    def test_logout_fails_without_authentication(self, client):
        """Caso: No se puede cerrar sesión si no se envía un Access Token válido"""
        logout_url = reverse("client:auth_logout")
        
        # Intentamos sin headers de autorización
        response = client.post(logout_url, {"refresh": "un_token_cualquiera"}, format="json")
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_logout_fails_with_invalid_refresh_token(self, api_client, user_factory):
        """Caso: El Access Token es correcto pero el Refresh Token enviado está mal o malformado"""
        # 1. Setup: Crear usuario y obtener URLs
        user_factory(username="enologo_bad_refresh", password="password123")
        login_url = reverse("client:token_obtain_pair")
        logout_url = reverse("client:auth_logout")

        # 2. Obtenemos un Access Token válido para poder "entrar" a la vista de logout
        login_res = api_client.post(login_url, {
            "username": "enologo_bad_refresh", 
            "password": "password123"
        }, format="json")
        access_token = login_res.data["access"]

        # 3. Autorizamos la petición
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

        # 4. Intentamos cerrar sesión con un refresh token inventado
        response = api_client.post(logout_url, {"refresh": "token_totalmente_falso_123"}, format="json")

        # 5. Verificaciones:
        # El serializador robusto detectará que el token no es válido y devolverá un 400.
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        
        # Verificamos que el error viene específicamente del campo 'refresh' 
        # (gracias a serializers.ValidationError en el backend)
        assert "refresh" in response.data
