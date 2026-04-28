from decimal import Decimal

from django.db import transaction

from pricing.models import IndirectCostConfig, ProductionCosting
from stock.models import StockMovement


class CostingService:

    @staticmethod
    @transaction.atomic
    def generate_escandallo(production_order):
        """
        Función Directora: Orquesta la creación del escandallo.
        """
        # 1. Obtener la configuración de costes indirectos activa
        config = IndirectCostConfig.objects.filter(is_active=True).first()
        if not config:
            raise ValueError(
                "Error: No hay una configuración de costos indirectos activa."
            )

        qty = Decimal(str(production_order.quantity_produced))

        # 2. Obtener el Snapshot de materiales (Función de obtención de costes)
        materials_snapshot = CostingService._get_materials_cost_snapshot(
            production_order
        )

        # 3. Sumar totales de materiales
        total_material_cost = sum(
            Decimal(str(item["total_cost"])) for item in materials_snapshot.values()
        )

        # 4. Calcular totales de indirectos
        labor_total = qty * config.labor_rate
        energy_total = qty * config.energy_rate
        amortization_total = qty * config.amortization_rate
        total_indirect = labor_total + energy_total + amortization_total

        # 5. Gran Total y Unitario
        grand_total = total_material_cost + total_indirect
        unit_cost = grand_total / qty if qty > 0 else Decimal("0")

        # 6. Guardar en Base de Datos
        return ProductionCosting.objects.create(
            production_order=production_order,
            materials_snapshot=materials_snapshot,
            labor_total=labor_total,
            energy_total=energy_total,
            amortization_total=amortization_total,
            total_material_cost=total_material_cost,
            total_indirect_cost=total_indirect,
            grand_total=grand_total,
            unit_cost=unit_cost,
        )

    @staticmethod
    def _get_materials_cost_snapshot(production_order):
        """
        Calcula los costes de materiales basándose en los movimientos de stock
        reales, vinculándolos con sus precios de compra originales.
        """
        # 1. Buscamos movimientos de salida vinculados a esta orden
        # IMPORTANTE: Usamos los nombres de campos de tu modelo OrderItem
        movements = StockMovement.objects.filter(
            movement_type="OUT", notes__icontains=production_order.lot_number
        ).select_related(
            "batch__order_item__packaging",
            "batch__order_item__label",
            "batch__order_item__enological",
        )

        snapshot = {}

        for m in movements:
            if not m.batch or not m.batch.order_item:
                continue

            oi = m.batch.order_item
            # Identificamos el objeto de material (coalescencia de los 3 campos)
            material_obj = oi.packaging or oi.label or oi.enological

            if not material_obj:
                continue

            qty_used = abs(Decimal(str(m.quantity)))
            unit_price = Decimal(str(oi.unit_price))
            material_name = material_obj.name

            # Si el material ya existe en el snapshot (ej. dos lotes del mismo material)
            if material_name in snapshot:
                snapshot[material_name]["quantity"] = float(
                    Decimal(str(snapshot[material_name]["quantity"])) + qty_used
                )
                snapshot[material_name]["total_cost"] = float(
                    Decimal(str(snapshot[material_name]["total_cost"]))
                    + (qty_used * unit_price)
                )
            else:
                snapshot[material_name] = {
                    "material_id": material_obj.id,
                    "unit_price": float(unit_price),
                    "quantity": float(qty_used),
                    "total_cost": float(qty_used * unit_price),
                    "unit": getattr(material_obj, "unit_measure", "unidades"),
                }

        return snapshot
