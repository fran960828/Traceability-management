from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.template.loader import render_to_string
from weasyprint import HTML


def export_traceability_pdf(traceability_instance):
    """
    Toma una instancia de LotTraceability, usa su history_snapshot 
    y genera un buffer de PDF listo para descargar o guardar.
    """
    snapshot=traceability_instance.history_snapshot
    
    # 1. Preparamos el contexto para la plantilla
    # Usamos la estructura que definimos en el JSON
    context = {
        "content": snapshot.get('content') if snapshot.get('content') else snapshot,
        "integrity_hash": traceability_instance.integrity_hash,
        "generated_at": traceability_instance.created_at.strftime("%d/%m/%Y %H:%M"),
    }

    # 2. Renderizamos el HTML a una string
    try:
        html_string = render_to_string(
            'traceability/traceability_report.html', 
            context
        )
    except Exception as e:
        raise ImproperlyConfigured(f"Error al renderizar la plantilla: {e}")

    # 3. Configuración de WeasyPrint
    # Creamos el objeto HTML desde la string
    html = HTML(string=html_string, base_url=settings.BASE_DIR)
    
    # Generamos el PDF
    # Podríamos añadir CSS externo aquí si quisiéramos, pero ya va en el <style> del HTML
    pdf_file = html.write_pdf()

    return pdf_file