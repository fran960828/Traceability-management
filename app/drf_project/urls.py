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
    path("api/wines/", include("wines.urls")),
    path("api/purchase/", include("purchase.urls")),
    path("api/stock/", include("stock.urls")),
    path("api/production/", include("production_record.urls")),
    path("api/analytics/", include("analytics.urls")),
    path("api/traceability/", include("traceability.urls")),
    path("api/pricing/", include("pricing.urls")),
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
