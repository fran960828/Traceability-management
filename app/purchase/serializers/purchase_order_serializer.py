from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

from purchase.models import PurchaseOrder, PurchaseOrderItem

from .purchase_order_item_serializer import PurchaseOrderItemSerializer


class PurchaseOrderSerializer(serializers.ModelSerializer):
    # Relación anidada: 'many=True' indica que 'items' es una lista de objetos.
    items = PurchaseOrderItemSerializer(many=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            "id",
            "order_number",
            "supplier",
            "status",
            "date_issued",
            "date_delivery_expected",
            "notes",
            "items",
        ]
        # Estos campos son automáticos, el usuario no puede enviarlos para hackear la fecha o el ID.
        read_only_fields = ["order_number", "date_issued"]

    def validate_items(self, value):
        """Validación de negocio: No se permiten órdenes vacías."""
        if not value or len(value) == 0:
            raise serializers.ValidationError(
                "Una orden de compra debe tener al menos una línea de producto."
            )
        return value

    def _validate_role_restrictions(self, attrs):
        """
        Encapsula las restricciones por rol del usuario.
        """
        user = self.context.get("request").user if self.context.get("request") else None

        if user and user.role == "BODEGUERO":
            blocked_fields = {"unit_price", "supplier", "order_number"}
            # Intersección de conjuntos: eficiente y limpio
            attempted_changes = blocked_fields.intersection(attrs.keys())

            if attempted_changes:
                fields_str = ", ".join(attempted_changes)
                raise serializers.ValidationError(
                    f"El rol BODEGUERO no tiene permisos para modificar: {fields_str}"
                )

    def _validate_status_constraints(self):
        """Regla: Órdenes CERRADAS o CANCELADAS son inmutables."""
        # 'self.instance' existe solo durante un UPDATE, no en un CREATE
        if self.instance and self.instance.status in [
            PurchaseOrder.Status.CLOSED,
            PurchaseOrder.Status.CANCELLED,
        ]:
            raise serializers.ValidationError(
                f"Acceso denegado: La orden está en estado {self.instance.status} y no permite cambios."
            )

    def validate(self, attrs):

        self._validate_role_restrictions(attrs)

        self._validate_status_constraints()

        return super().validate(attrs)

    def create(self, validated_data):
        """
        Lógica para guardar la Orden y sus Líneas al mismo tiempo.
        """
        # 1. Extraemos la lista de items del diccionario de datos validados.
        items_data = validated_data.pop("items")

        # 2. 'transaction.atomic()': O se guarda TODO o no se guarda NADA.
        # Si falla la creación del 3er corcho, se borra la Orden creada arriba automáticamente.
        with transaction.atomic():
            # Creamos la cabecera (PurchaseOrder).
            order = PurchaseOrder.objects.create(**validated_data)

            # Recorremos la lista de líneas y las creamos vinculándolas a la 'order' recién creada.
            for item_data in items_data:
                PurchaseOrderItem.objects.create(purchase_order=order, **item_data)

        return order

    def update(self, instance, validated_data):
        """
        Lógica para actualizar una orden que ya existe.
        """
        # Sacamos los nuevos items que nos envía el frontend.
        items_data = validated_data.pop("items", None)

        try:
            with transaction.atomic():
                # Actualizamos los campos básicos de la cabecera (notas, proveedor...).
                instance = super().update(instance, validated_data)

                # Si nos han enviado líneas nuevas...
                if items_data is not None:
                    # Estrategia ERP estándar: Borramos las líneas viejas y creamos las nuevas.
                    # Es más limpio que intentar adivinar cuál se editó, cuál se borró y cuál es nueva.
                    instance.items.all().delete()
                    for item_data in items_data:
                        PurchaseOrderItem.objects.create(
                            purchase_order=instance, **item_data
                        )
        except DjangoValidationError as e:
            # Capturamos el error si alguien intenta editar una orden CLOSED (bloqueo del modelo).
            raise serializers.ValidationError(e.message_dict)

        return instance
