from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import LotTraceabilityViewSet

# Namespace para referenciar las rutas (ej: 'traceability:lot-traceability-list')
app_name = "traceability"

router = DefaultRouter()

# Registramos el ViewSet de Trazabilidad
# Al ser ReadOnlyModelViewSet, solo generará rutas GET (list y retrieve)
router.register(
    r"lot-traceability", LotTraceabilityViewSet, basename="lot-traceability"
)

urlpatterns = [
    path("", include(router.urls)),
]
