from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import (TokenObtainPairSerializer,
                                                  TokenRefreshSerializer)
from rest_framework_simplejwt.tokens import RefreshToken


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        # Obtenemos el token base
        token = super().get_token(user)

        # Añadimos nuestras "Custom Claims" (reclamaciones)
        token["username"] = user.username
        token["email"] = user.email
        token["role"] = user.role
        # Esto es muy útil para React:
        token["is_staff"] = user.is_staff

        return token

    def validate(self, attrs):
        # Esto genera el diccionario {'access': '...', 'refresh': '...'}
        data = super().validate(attrs)

        # --- AQUÍ ESTÁ EL TRUCO PARA EL TEST ---
        # Esto mete el rol en la RESPUESTA JSON (lo que ve el test)
        data["role"] = self.user.role
        data["username"] = self.user.username

        return data


class MyTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        # Obtenemos el objeto RefreshToken a partir del token enviado
        refresh = RefreshToken(attrs["refresh"])
        # Añadimos los datos del usuario al nuevo access token
        # Nota: 'user' está disponible en el objeto refresh si el token es válido
        user_id = refresh.payload.get("user_id")
        User = get_user_model()
        user = User.objects.get(id=user_id)

        # Inyectamos los claims en la respuesta (opcional) o en el token
        # Lo más limpio es que el propio token los lleve:
        data["role"] = user.role
        data["username"] = user.username

        return data
