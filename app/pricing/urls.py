from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import IndirectCostConfigViewSet, ProductionCostingViewSet

# Namespace para la app de precios/costes
app_name = "pricing"

router = DefaultRouter()

# 1. Rutas para la CONFIGURACIÓN (CRUD completo)
# URL: /api/pricing/indirect-costs/
router.register(
    r"indirect-costs", 
    IndirectCostConfigViewSet, 
    basename="indirect-cost"
)

# 2. Rutas para los RESULTADOS (ReadOnly)
# URL: /api/pricing/production-costs/
# Recuerda que este usa el lot_number como lookup_field
router.register(
    r"production-costs", 
    ProductionCostingViewSet, 
    basename="production-costing"
)

urlpatterns = [
    path("", include(router.urls)),
]