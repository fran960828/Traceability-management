import hashlib
import json

from rest_framework import serializers

from .models import LotTraceability


class LotTraceabilitySerializer(serializers.ModelSerializer):
    # Campos dinámicos para el reporte
    integrity_status = serializers.SerializerMethodField()
    content = serializers.JSONField(source='history_snapshot')
    generated_at = serializers.DateTimeField(source='created_at', format="%d/%m/%Y %H:%M")
    
    class Meta:
        model = LotTraceability
        fields = [
            'id', 
            'production_order', 
            'generated_at', 
            'integrity_status', 
            'integrity_hash',
            'content'
        ]
        # Bloqueamos cualquier intento de edición vía API
        read_only_fields = fields

    def get_integrity_status(self, obj):
        """
        Verificación de seguridad en tiempo real.
        Compara el contenido actual del snapshot con la firma digital (hash).
        """
        try:
            # Re-calculamos el hash del JSON guardado
            current_content = json.dumps(obj.history_snapshot, sort_keys=True).encode()
            current_hash = hashlib.sha256(current_content).hexdigest()
            
            if current_hash == obj.integrity_hash:
                return {
                    "valid": True,
                    "message": "Firma digital verificada. El documento es íntegro."
                }
            else:
                return {
                    "valid": False,
                    "message": "ALERTA: La firma digital no coincide. El expediente ha sido manipulado."
                }
        except Exception as e:
            return {"valid": False, "message": f"Error en verificación: {str(e)}"}