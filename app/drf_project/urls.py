"""
URL configuration for drf_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (SpectacularAPIView, SpectacularRedocView,
                                   SpectacularSwaggerView)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("client.urls")),
    path("api/supplier/", include("supplier.urls")),
    path("api/inventory/", include("inventory.urls")),
    path("api/wines", include("wines.urls")),
    path("api/purchase", include("purchase.urls")),
]

if settings.DEBUG:
    urlpatterns += [
        # A. El "Cerebro" (Schema)
        # Genera el archivo dinámico (YAML/JSON) que describe TODA tu API.
        # Sin esto, el Swagger no tiene nada que leer.
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        # B. La "Cara" (Swagger UI)
        # Es la interfaz interactiva donde puedes hacer "Try it out".
        # Se conecta al 'schema' definido arriba.
        path(
            "api/docs/",
            SpectacularSwaggerView.as_view(url_name="schema"),
            name="swagger-ui",
        ),
        # C. La "Alternativa" (Redoc)
        # Es otra forma de ver la documentación, más limpia y enfocada a lectura (estilo Stripe).
        path(
            "api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"
        ),
    ]
