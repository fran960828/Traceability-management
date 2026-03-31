import pytest
from django.core.exceptions import ValidationError
from purchase.models import PurchaseOrderItem, PurchaseOrder

@pytest.mark.django_db
class TestPurchaseOrderItemModel:

    # --- HAPPY PATH ---
    def test_create_valid_packaging_item(self, purchase_order_factory, packaging_factory):
        """Validar que se puede añadir un material de packaging correctamente"""
        po = purchase_order_factory(status=PurchaseOrder.Status.OPEN)
        item = PurchaseOrderItem(
            purchase_order=po,
            packaging=packaging_factory(),
            quantity_ordered=1000,
            unit_price=0.50
        )
        item.full_clean()
        item.save()
        assert item.material_name is not None

    # --- EDGE CASES (Validación de Materiales) ---
    def test_error_multiple_materials_exclusive(self, purchase_order_item_factory, packaging_factory, label_factory):
        """VULNERABILIDAD: No permitir asignar dos tipos de materiales a una línea"""
        item = purchase_order_item_factory.build(
            packaging=packaging_factory(),
            label=label_factory(),
            enological=None
        )
        with pytest.raises(ValidationError) as exc:
            item.full_clean()
        assert "Una línea de pedido solo puede contener un tipo de producto" in str(exc.value)

    def test_error_no_material_selected(self, purchase_order_item_factory):
        """EDGE CASE: No permitir líneas vacías de material"""
        item = purchase_order_item_factory.build(packaging=None, label=None, enological=None)
        with pytest.raises(ValidationError) as exc:
            item.full_clean()
        assert "Debe seleccionar un producto" in str(exc.value)

    # --- VULNERABILIDADES FINANCIERAS ---
    def test_negative_price_protection(self, purchase_order_item_factory, enological_factory):
        """VULNERABILIDAD: Evitar precios negativos que alteren la valoración de stock"""
        item = purchase_order_item_factory.build(
            enological=enological_factory(),
            unit_price=-10.0
        )
        
        # 2. Capturamos la excepción
        with pytest.raises(ValidationError) as excinfo:
            item.full_clean()
        
            # 3. Accedemos al diccionario de errores
            errors = excinfo.value.message_dict
            
            # 4. Asserts críticos
            assert 'unit_price' in errors, "El error debería estar asociado al campo unit_price"
            # Opcional: Verificar que el mensaje es el del validador de precio
            assert any("mayor que" in msg or "0.0001" in msg for msg in errors['unit_price'])
            

    # --- PROTECCIÓN DE DATOS CERRADOS ---
    def test_prevent_item_modification_on_closed_order(self, purchase_order_factory, purchase_order_item_factory):
        """VULNERABILIDAD: Bloquear cambios en líneas si la cabecera está CERRADA"""
        po = purchase_order_factory(status=PurchaseOrder.Status.CLOSED)
        # Intentamos crear/modificar un item asociado a esa PO
        item = purchase_order_item_factory.build(purchase_order=po)
        
        with pytest.raises(ValidationError) as exc:
            item.full_clean()
        assert "No se puede modificar una línea de una orden cerrada" in str(exc.value)