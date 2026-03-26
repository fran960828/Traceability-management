from django.urls import path

from client.views import MyTokenObtainPairView, MyTokenRefreshView

app_name = "client"
urlpatterns = [
    # Endpoint para obtener el token (Login)
    path("login/", MyTokenObtainPairView.as_view(), name="token_obtain_pair"),
    # URL final: /api/auth/refresh/
    path("refresh/", MyTokenRefreshView.as_view(), name="token_refresh"),
]
