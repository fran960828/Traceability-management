from django.db import transaction
from rest_framework import serializers

from pricing.models import IndirectCostConfig


class IndirectCostConfigSerializer(serializers.ModelSerializer):
    """
    Serializer robusto para la gestión de tasas de costes indirectos.
    Incluye validaciones de negocio para asegurar la integridad de los cálculos.
    """
    labor_rate = serializers.DecimalField(max_digits=10, decimal_places=4, required=True)
    energy_rate = serializers.DecimalField(max_digits=10, decimal_places=4, required=True)
    amortization_rate = serializers.DecimalField(max_digits=10, decimal_places=4, required=True)
    
    class Meta:
        model = IndirectCostConfig
        fields = [
            'id', 
            'name', 
            'labor_rate', 
            'energy_rate', 
            'amortization_rate', 
            'is_active', 
            'created_at'
        ]
        read_only_fields = ['created_at']

    def validate_labor_rate(self, value):
        if value < 0:
            raise serializers.ValidationError("La tasa de mano de obra no puede ser negativa.")
        return value

    def validate_energy_rate(self, value):
        if value < 0:
            raise serializers.ValidationError("La tasa de energía no puede ser negativa.")
        return value

    def validate_amortization_rate(self, value):
        if value < 0:
            raise serializers.ValidationError("La tasa de amortización no puede ser negativa.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        """
        Si se crea una configuración como 'activa', desactivamos 
        automáticamente las demás para mantener la integridad.
        """
        is_active = validated_data.get('is_active', False)
        
        if is_active:
            IndirectCostConfig.objects.filter(is_active=True).update(is_active=False)
            
        return super().create(validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        """
        Si se marca como activa una configuración existente, 
        desactivamos el resto.
        """
        is_active = validated_data.get('is_active', instance.is_active)
        
        if is_active:
            IndirectCostConfig.objects.exclude(id=instance.id).filter(is_active=True).update(is_active=False)
            
        return super().update(instance, validated_data)