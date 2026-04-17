# stock/selectors.py
from django.db.models import Sum

from stock.models import Batch

# stock/selectors.py


def get_batches_with_stock(material):
    model_name = material._meta.model_name

    mapping = {
        "labelmaterialmodel": "order_item__label",
        "packagingmaterialmodel": "order_item__packaging",
        "enologicalmaterialmodel": "order_item__enological",
    }

    filter_key = mapping.get(model_name)

    # --- LA MEJORA: Exclusión explícita ---
    # Queremos que el campo 'filter_key' sea nuestro material
    filters = {filter_key: material}

    for key in mapping.values():
        if key != filter_key:
            filters[f"{key}__isnull"] = True

    return (
        Batch.objects.filter(**filters)
        .annotate(stock=Sum("movements__quantity"))
        .filter(stock__gt=0)
        .order_by("arrival_date")
    )


"""
PASO A PASO:
    1. Identifica el modelo del material (Etiqueta, Envase o Enológico) usando metadatos.
    2. Mapea el modelo al campo correspondiente en 'OrderItem' para construir la query.
    3. 'filter': Busca lotes que pertenezcan a ese material concreto.
    4. 'annotate': Pide a la DB que sume todas las cantidades de los movimientos del lote
       y lo guarde en el atributo virtual '.stock'. Es más eficiente que calcularlo en Python.
    5. 'filter(stock__gt=0)': Descarta lotes vacíos para no procesar datos innecesarios.
    6. 'order_by': Ordena por fecha de creación (ascendente). Esto garantiza el orden FIFO.

"""
