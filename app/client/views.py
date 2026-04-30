from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import (TokenObtainPairView,
                                            TokenRefreshView)

from client.serializers import (LogoutSerializer, MyTokenObtainPairSerializer,
                                MyTokenRefreshSerializer)


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


class LogoutView(APIView):
    """
    Invalida de forma segura la sesión del usuario.
    Requiere un access token válido para identificar al peticionario 
    y el refresh token para mandarlo a la lista negra.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LogoutSerializer

    @extend_schema(
        tags=["Autenticación"],
        summary="Cerrar sesión (Blacklist)",
        description="Invalida el refresh token del usuario para prevenir accesos futuros.",
        request=LogoutSerializer,
        responses={
            205: OpenApiResponse(description="Sesión cerrada con éxito."),
            400: OpenApiResponse(description="Token de refresco malformado o expirado."),
            401: OpenApiResponse(description="No autorizado: Access token inválido o ausente.")
        }
    )
    def post(self, request):
        # 1. Instanciamos el serializador con los datos del body
        serializer = self.serializer_class(data=request.data)
        
        # 2. Validamos (esto ejecutará el método validate del serializador)
        serializer.is_valid(raise_exception=True)
        
        # 3. Ejecutamos la lógica de negocio (blacklist) definida en el save()
        serializer.save()
        
        # 4. Respondemos con 205 (Reset Content), que es el estándar para logouts
        return Response(
            {"detail": "La sesión ha sido cerrada correctamente."},
            status=status.HTTP_205_RESET_CONTENT
        )