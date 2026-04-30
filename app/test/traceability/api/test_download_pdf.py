import pytest
from django.template.loader import render_to_string
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestTraceabilityPDF:

    def test_download_pdf_success(self, auth_client, orden_trazada_y_confirmada):
        """
        Verifica que el endpoint de descarga devuelve un PDF válido.
        """
        # 1. Obtenemos el lote de la orden que ya tiene trazabilidad
        lot_number = orden_trazada_y_confirmada.lot_number
        
        # 2. Construimos la URL de la acción (action)
        # El nombre suele ser: {basename}-{action_name}
        url = reverse('traceability:lot-traceability-download-pdf', kwargs={'lot_number': lot_number})

        # 3. Realizamos la petición GET
        response = auth_client.get(url)

        # 4. Aserciones
        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'application/pdf'
        assert f'attachment; filename="Informe_Trazabilidad_{lot_number}.pdf"' in response['Content-Disposition']
        
        # Verificamos que el contenido no esté vacío y parezca un PDF (%PDF-1.7...)
        assert len(response.content) > 0
        assert response.content.startswith(b'%PDF')

    def test_download_pdf_not_found(self, auth_client):
        """Si el lote no existe, debe dar 404."""
        url = reverse('traceability:lot-traceability-download-pdf', kwargs={'lot_number': 'LOTE-FANTASMA'})
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND


    def test_pdf_context_is_correct(self, orden_trazada_y_confirmada):
    # 1. Obtenemos los datos del snapshot
        instance = orden_trazada_y_confirmada.traceability_record
        context = {
            "content": instance.history_snapshot.get('content', instance.history_snapshot),
            "integrity_hash": instance.integrity_hash,
        }

        # 2. Renderizamos solo el HTML
        html_content = render_to_string('traceability/traceability_report.html', context)
        # 3. Aquí el texto SÍ es legible
        assert orden_trazada_y_confirmada.wine.name in html_content
        assert orden_trazada_y_confirmada.lot_number in html_content