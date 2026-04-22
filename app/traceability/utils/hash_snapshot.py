import hashlib
import json
from .get_material_batch import get_actual_batches_used

def generate_snapshot(production_order):
    """
    Crea una 'foto' inalterable de la orden, incluyendo packaging y enológicos.
    """
    wine = production_order.wine
    
    return {
        "order_details": {
            "lot_number": production_order.lot_number,
            "production_date": str(production_order.production_date),
            "quantity_produced": production_order.quantity_produced,
            "user_responsible": production_order.user.get_full_name() if production_order.user else "N/A",
            "wine_name": wine.name,
        },
        "efficiency": {
            "bulk_liters_withdrawn": str(production_order.bulk_liters_withdrawn),
            "total_liters_bottled": str(production_order.total_liters),
            "loss_liters": str(production_order.loss_liters),
            "loss_percentage": f"{production_order.loss_percentage}%",
        },
        # --- MATERIALES DE PACKAGING (Botella, Corcho, etc.) ---
        "packaging_materials": [
            {
                "category": label, # 'Envase', 'Cierre', etc.
                "material_name": material.name if material else "No definido",
                "total_quantity": production_order.quantity_produced,
                "lot":get_actual_batches_used(production_order, material),
                "unit": "unidades"
            }
            # Usamos el método interno que ya definimos en el modelo
            for material, qty, label in production_order._get_recipe_items()
            if material is not None
        ],
        # --- ADITIVOS ENOLÓGICOS (Metabisulfito, Clarificantes, etc.) ---
        "enological_additives": [
            {
                "material": item.material.name,
                "quantity_used": str(item.quantity_used),
                "unit": item.material.unit_mesure,
                "lot": get_actual_batches_used(production_order, item.material),
                "dosage_ratio": str(item.quantity_used / production_order.quantity_produced) 
                                if production_order.quantity_produced > 0 else "0"
            } for item in production_order.enological_materials.all()
        ],
    }

def generate_integrity_hash(snapshot_data):
    """
    Crea una firma única basada en los datos del snapshot.
    """
    # Ordenamos las llaves del JSON para que el hash sea siempre igual 
    # ante los mismos datos (estabilidad del diccionario)
    encoded_data = json.dumps(snapshot_data, sort_keys=True).encode()
    return hashlib.sha256(encoded_data).hexdigest()