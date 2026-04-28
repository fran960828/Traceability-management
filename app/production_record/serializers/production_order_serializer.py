from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from pricing.serializers.production_costing_serializer import ProductionCostingSerializer
from production_record.models import ProductionEnologicalItem, ProductionOrder
from production_record.serializers import ProductionEnologicalItemSerializer
from wines.services import WineRecipeService


class ProductionOrderSerializer(serializers.ModelSerializer):
    # Usamos el related_name definido en el modelo: enological_materials
    enological_materials = ProductionEnologicalItemSerializer(many=True, required=False)
    loss_liters = serializers.DecimalField(
        max_digits=12, decimal_places=3, read_only=True
    )
    loss_percentage = serializers.FloatField(read_only=True)
    # Lectura amigable
    total_liters = serializers.DecimalField(
        max_digits=12, decimal_places=3, read_only=True
    )
    wine_name = serializers.ReadOnlyField(source="wine.name")
    user_username = serializers.ReadOnlyField(source="user.username")
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    # Usamos el related_name que definimos en el modelo (o el nombre del modelo en minúsculas)
    # Lo marcamos como read_only porque el coste se genera por servicio, no por el usuario
    costing = ProductionCostingSerializer(source='"costing_record"', read_only=True)

    class Meta:
        model = ProductionOrder
        fields = [
            "id",
            "lot_number",
            "wine",
            "wine_name",
            "user",
            "user_username",
            "production_date",
            "quantity_produced",
            "status",
            "status_display",
            "total_liters",
            "bulk_liters_withdrawn",
            "loss_liters",
            "loss_percentage",
            "notes",
            "enological_materials",
            "costing",
            "created_at",
        ]
        read_only_fields = ["status", "created_at"]

    def validate_production_date(self, value):
        if value > timezone.now().date():
            raise serializers.ValidationError(
                "La fecha de embotellado no puede ser futura."
            )
        return value

    def _validate_status_is_draft(self):
        if self.instance and self.instance.status != ProductionOrder.Status.DRAFT:
            raise serializers.ValidationError(
                "No se puede modificar una orden que ya ha sido confirmada o cancelada."
            )

    def _validate_wine_recipe(self, data):
        wine = data.get("wine", getattr(self.instance, "wine", None))
        if not wine:
            return

        missing_elements = WineRecipeService.get_recipe_deficiencies(wine)
        if missing_elements:
            container_type = (
                wine.default_container.packaging_type
                if wine.default_container
                else "No definido"
            )
            raise serializers.ValidationError(
                {
                    "wine": f"Receta incompleta para el formato {container_type}. Falta: {', '.join(missing_elements)}"
                }
            )

    def validate(self, data):
        # 1. Validar estado (No editar si está cerrada)
        self._validate_status_is_draft()

        # 2. Validar receta (Delegación a servicio)
        self._validate_wine_recipe(data)

        return data

    @transaction.atomic
    def create(self, validated_data):
        """Manejo de creación anidada de insumos enológicos."""
        enological_data = validated_data.pop("enological_materials", [])

        # El user se suele inyectar desde el ViewSet (perform_create),
        # pero si no, lo manejamos aquí.
        order = ProductionOrder.objects.create(**validated_data)

        for item_data in enological_data:
            ProductionEnologicalItem.objects.create(production_order=order, **item_data)

        return order

    @transaction.atomic
    def update(self, instance, validated_data):
        """Protección de órdenes confirmadas y actualización de insumos."""

        enological_data = validated_data.pop("enological_materials", None)

        # Actualizamos campos básicos
        instance = super().update(instance, validated_data)

        # Si se envían materiales enológicos, reemplazamos los anteriores (patrón común en DRF)
        if enological_data is not None:
            instance.enological_materials.all().delete()
            for item_data in enological_data:
                ProductionEnologicalItem.objects.create(
                    production_order=instance, **item_data
                )

        return instance
