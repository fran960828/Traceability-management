# stock/services.py
from django.core.exceptions import ValidationError

from stock.models import StockMovement
from stock.selectors import get_batches_with_stock

# stock/services.py


class FIFOService:
    @staticmethod
    def consume_material(material, quantity, user, reference_note):
        batches = get_batches_with_stock(material)

        total_available = sum(b.stock for b in batches)
        if total_available < quantity:
            raise ValidationError(f"Stock insuficiente para {material.name}")

        pending = quantity
        for batch in batches:
            if pending <= 0:
                break

            take = min(batch.stock, pending)

            if take <= 0:
                continue

            # Buscamos la ubicación de la entrada original de este lote
            # para que la salida sea coherente en el inventario.
            first_movement = batch.movements.first()
            batch_location = first_movement.location if first_movement else None

            StockMovement.objects.create(
                batch=batch,
                quantity=-take,
                movement_type="OUT",
                user=user,
                location=batch_location,
                notes=reference_note,
            )
            pending -= take

    # flake8: noqa
    """
        ALGORITMO FIFO (First In, First Out):
        Consume una cantidad total de un material usando la estrategia de 'cascada'.
        
        PASO A PASO:
        1. Obtiene los lotes con existencias reales mediante el Selector (ya ordenados por antigüedad).
        2. Realiza una validación previa: suma el stock de todos los lotes. Si el total es 
           menor a lo solicitado, lanza un error y aborta (evita cálculos parciales).
        3. Inicializa 'pending' con la cantidad total necesaria (ej: 1000 unidades).
        4. Inicia un bucle sobre los lotes:
           a. Calcula cuánto puede extraer del lote actual (el mínimo entre lo que hay y lo que falta).
           b. Crea un StockMovement de tipo 'OUT' (cantidad negativa) vinculado a ese lote específico.
           c. Resta lo extraído de la cantidad 'pending'.
           d. Si 'pending' llega a 0, rompe el bucle (objetivo cumplido).
        5. Al estar pensado para ejecutarse dentro de un @transaction.atomic (en el modelo), 
           si el proceso falla en cualquier material, todos los movimientos se revierten.
        """
