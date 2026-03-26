from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, SupplierViewSet

# Definimos el namespace para que coincida con tus tests (entities:...)
app_name = "supplier"

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"suppliers", SupplierViewSet, basename="supplier")

urlpatterns = [
    path("", include(router.urls)),
]
