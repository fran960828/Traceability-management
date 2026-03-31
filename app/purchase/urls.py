from django.urls import include, path
from rest_framework.routers import DefaultRouter

from purchase.views import PurchaseOrderViewSet, PurchaseOrderItemViewSet

# El namespace debe coincidir con el que uses en tus tests (ej: reverse('purchase:order-list'))
app_name = "purchase"

router = DefaultRouter()

# Registramos el ViewSet de Órdenes de Compra (Cabeceras)
router.register(r"orders", PurchaseOrderViewSet, basename="order")

# Registramos el ViewSet de Líneas de Pedido (Items)
router.register(r"items", PurchaseOrderItemViewSet, basename="order-item")

urlpatterns = [
    # Incluimos todas las rutas generadas por el router
    path("", include(router.urls)),
]