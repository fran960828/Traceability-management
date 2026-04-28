# pricing/apps.py
from django.apps import AppConfig


class PricingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "pricing"

    def ready(self):
        # Importamos las señales para que el escandallo se genere 
        # automáticamente al confirmar producciones.
        import pricing.signals  # noqa: F401
