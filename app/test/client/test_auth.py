import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

User = get_user_model()


@pytest.mark.django_db
def test_user_can_login_and_get_tokens(client):
    # 1. Crear usuario de prueba
    username = "enologo_test"
    password = "password123"
    User.objects.create_user(username=username, password=password)

    # 2. Intentar hacer login
    url = reverse("client:token_obtain_pair")
    response = client.post(
        url, {"username": username, "password": password}, format="json"
    )

    # 3. Asertar que recibimos los tokens
    assert response.status_code == 200
    assert "access" in response.data
    assert "refresh" in response.data
