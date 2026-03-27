from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from client.serializers import MyTokenObtainPairSerializer, MyTokenRefreshSerializer


@extend_schema(
    tags=["Autenticación"],
    summary="Obtener tokens JWT",
    description="Envía email y password para recibir los tokens de acceso y refresco.",
    responses={
        200: OpenApiResponse(description="Tokens generados correctamente."),
        400: OpenApiResponse(
            description="Error de Formato: Faltan campos obligatorios o el formato de email es inválido."
        ),
        401: OpenApiResponse(description="Credenciales inválidas."),
    },
)
class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


@extend_schema(
    tags=["Autenticación"],
    summary="Refrescar token de acceso",
    description="Envía el 'refresh token' para obtener un nuevo 'access token' válido sin pedir credenciales.",
    responses={
        200: OpenApiResponse(description="Token de acceso renovado con éxito."),
        401: OpenApiResponse(description="Token de refresco inválido o expirado."),
    },
)
class MyTokenRefreshView(TokenRefreshView):
    serializer_class = MyTokenRefreshSerializer
