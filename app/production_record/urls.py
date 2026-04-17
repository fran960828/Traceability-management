from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ProductionOrderViewSet

# Namespace para referenciar las rutas (ej: 'production:order-list')
app_name = "production_record"

router = DefaultRouter()

# Registramos el ViewSet de Órdenes de Producción
router.register(r"orders", ProductionOrderViewSet, basename="order")

urlpatterns = [
    # Prefijo vacío porque el router ya gestiona las rutas internas
    path("", include(router.urls)),
]
