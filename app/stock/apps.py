from django.apps import AppConfig


class StockConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = "stock"
    def ready(self):
        # Importamos las señales aquí para que Django las registre al iniciar
        import stock.signals



