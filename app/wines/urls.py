from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import WineViewSet

# Definimos el namespace para la app de vinos
app_name = "wines"

router = DefaultRouter()
# Registramos el ViewSet de vinos
router.register(r"wines", WineViewSet, basename="wine")

urlpatterns = [
    # Incluimos todas las rutas generadas por el router (GET, POST, PUT, DELETE...)
    path("", include(router.urls)),
]
