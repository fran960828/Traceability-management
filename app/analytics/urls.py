from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import WineAnalysisViewSet

# Namespace para la app de analíticas
app_name = "analytics"

router = DefaultRouter()
# Registramos el ViewSet de análisis
router.register(r"analyses", WineAnalysisViewSet, basename="analysis")

urlpatterns = [
    # Incluimos las rutas del router:
    # GET /api/analytics/analyses/ -> Listar y filtrar
    # POST /api/analytics/analyses/ -> Crear
    # GET /api/analytics/analyses/{id}/ -> Detalle
    path("", include(router.urls)),
]
