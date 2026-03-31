from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    EnologicalMaterialViewSet,
    LabelMaterialViewSet,
    PackagingMaterialViewSet,
)

# Definimos el namespace para la app de inventario
app_name = "inventory"

router = DefaultRouter()

# Registro de las rutas para materiales
router.register(r"packaging", PackagingMaterialViewSet, basename="packaging")
router.register(r"enological", EnologicalMaterialViewSet, basename="enological")
router.register(r"labels", LabelMaterialViewSet, basename="label")

urlpatterns = [
    path("", include(router.urls)),
]
