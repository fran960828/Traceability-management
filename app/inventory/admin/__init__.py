from .enological_material_admin import EnologicalMaterialAdmin
from .label_material_admin import LabelMaterialAdmin
from .packaging_material_admin import PackagingMaterialAdmin

# Si mañana creas enological.py, lo importarás aquí también
__all__ = ["PackagingMaterialAdmin", "EnologicalMaterialAdmin", "LabelMaterialAdmin"]
