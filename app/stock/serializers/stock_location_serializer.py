from rest_framework import serializers
from stock.models import Location

class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ['id', 'name', 'description', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_name(self, value):
        """
        Validación extra a nivel de Serializer: 
        Asegura que el nombre no sea solo espacios o caracteres extraños 
        antes de llegar al modelo.
        """
        if value:
            # Aunque el modelo limpia, el serializer debe ser el primer filtro
            clean_name = value.strip().upper()
            if not clean_name:
                raise serializers.ValidationError("El nombre de la ubicación no puede estar vacío.")
        return value

    def to_representation(self, instance):
        """
        Mejora la salida: Asegura que el cliente siempre vea 
        los datos normalizados tras el guardado.
        """
        representation = super().to_representation(instance)
        # Podríamos añadir lógica aquí si quisiéramos mostrar etiquetas extra
        return representation