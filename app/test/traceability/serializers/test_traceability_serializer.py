

import pytest

from traceability.serializers import LotTraceabilitySerializer


@pytest.mark.django_db
class TestLotTraceabilitySerializer:

    # --- HAPPY PATH ---

    def test_serializer_output_structure(self, orden_trazada_y_confirmada):
        """Verifica que el serializer devuelve todos los campos esperados con el formato correcto."""
        trace = orden_trazada_y_confirmada.traceability_record
        serializer = LotTraceabilitySerializer(instance=trace)
        data = serializer.data

        assert "integrity_status" in data
        assert "content" in data
        assert "integrity_hash" in data
        assert data["integrity_status"]["valid"] is True
        assert len(data["generated_at"].split("/")) == 3

    def test_serializer_contains_snapshot_data(self, orden_trazada_y_confirmada):
        """Verifica que el campo 'content' mapea correctamente el history_snapshot."""
        trace = orden_trazada_y_confirmada.traceability_record
        serializer = LotTraceabilitySerializer(instance=trace)

        assert (
            serializer.data["content"]["order_details"]["lot_number"]
            == orden_trazada_y_confirmada.lot_number
        )

    # --- EDGE CASES ---

    def test_integrity_validation_failure_in_serializer(
        self, orden_trazada_y_confirmada
    ):
        """
        EDGE CASE: Si el contenido del snapshot cambia (manipulación DB),
        el integrity_status debe marcar 'valid': False.
        """
        trace = orden_trazada_y_confirmada.traceability_record

        # Manipulamos el snapshot en el objeto en memoria
        trace.history_snapshot["order_details"]["lot_number"] = "LOTE-FALSO"

        serializer = LotTraceabilitySerializer(instance=trace)

        assert serializer.data["integrity_status"]["valid"] is False
        assert "manipulado" in serializer.data["integrity_status"]["message"].lower()

    # --- VALIDACIONES ---

    def test_serializer_read_only_fields(self, orden_trazada_y_confirmada):
        """
        VALIDACIÓN: Verifica que no se pueden enviar datos para modificar el expediente.
        Al ser un ModelSerializer con todos los campos read_only, el input debe ser ignorado.
        """
        trace = orden_trazada_y_confirmada.traceability_record
        invalid_data = {
            "integrity_hash": "un-hash-falso-inyectado",
            "history_snapshot": {"p": "hack"},
        }

        serializer = LotTraceabilitySerializer(
            instance=trace, data=invalid_data, partial=True
        )
        # En un serializer robusto de solo lectura, no debería haber errores de validación,
        # pero al hacer save() no debería cambiar nada.
        assert serializer.is_valid()
        serializer.save()

        trace.refresh_from_db()
        assert trace.integrity_hash != "un-hash-falso-inyectado"

    def test_empty_snapshot_handling(self, traceability_record_factory):
        """
        EDGE CASE: Manejo de un snapshot vacío (aunque la signal lo previene,
        el serializer debe ser resiliente).
        """
        # Creamos un registro con snapshot vacío manualmente saltándonos la lógica habitual
        trace = traceability_record_factory(history_snapshot={})
        serializer = LotTraceabilitySerializer(instance=trace)

        # El serializer no debe explotar y debe validar el hash (que será el hash de {})
        assert "integrity_status" in serializer.data
