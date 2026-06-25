from django.urls import include, path
from rest_framework.routers import DefaultRouter

from stock.views import AvailableStockViewSet,LocationViewSet,StockMovementViewSet



# El namespace 'stock' permite usar reverse('stock:movement-list') en los tests
app_name = "stock"

router = DefaultRouter()

# 1. Rutas para la gestión de ubicaciones (Almacenes/Zonas)
router.register(r"locations", LocationViewSet, basename="location")

# 2. Rutas para movimientos y operativas (Entradas, Traslados, Ajustes)
router.register(r"movements", StockMovementViewSet, basename="movement")

router.register(r"batch", AvailableStockViewSet, basename="existencias")

urlpatterns = [
    # Incluimos las rutas generadas por el router
    path("", include(router.urls)),
]
