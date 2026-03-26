import pytest

from client.serializers import MyTokenObtainPairSerializer


@pytest.mark.django_db
def test_token_obtain_serializer_adds_custom_claims(user_factory):
    # 1. Preparamos un usuario con un rol específico
    user = user_factory(username="enologo_test", role="ENOLOGO")

    # 2. Obtenemos los tokens manualmente a través del Serializer
    # Simple JWT requiere que pasemos las credenciales al método de clase
    token_data = MyTokenObtainPairSerializer.get_token(user)

    # 3. Verificamos que el "claim" personalizado existe en el token
    assert token_data["role"] == "ENOLOGO"
    assert token_data["username"] == "enologo_test"


@pytest.mark.django_db
def test_serializer_output_format(user_factory):
    # 1. Creamos el usuario (Usa tu user_factory manual)
    user_factory(username="test_bodega", password="password123", role="BODEGUERO")

    input_data = {"username": "test_bodega", "password": "password123"}
    # 3. Instanciamos el serializer
    serializer = MyTokenObtainPairSerializer(data=input_data)

    # 4. DISPARAMOS LA VALIDACIÓN (Esto es lo que ejecuta el método validate())
    assert serializer.is_valid(), serializer.errors

    # 5. Comprobamos los datos validados
    # Aquí es donde 'role' DEBE existir porque lo inyectamos en validate()
    assert "role" in serializer.validated_data
    assert serializer.validated_data["role"] == "BODEGUERO"
