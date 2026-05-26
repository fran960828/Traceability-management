import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LabelDetailView } from './Label.detail';
import { LABEL_TYPES, UNIT_MESURE, type LabelMaterial } from '../../models/label.schema';

// Mockeamos el componente subyacente para aislar la vista si fuera necesario, 
// aunque al ser un componente tonto de grid podemos testearlo de forma integrada
describe('LabelDetailView - Unit & Display Tests', () => {
  const mockOnEditClick = vi.fn();
  const mockOnDeleteClick = vi.fn();
  const mockOnBack = vi.fn();

  // Ficha técnica simulada para la inspección visual del test
  const mockLabelData: LabelMaterial = {
    id: 88,
    internal_code:'ETI01-2026',
    name: 'Etiqueta Frontal Ontalba Ecofriendly',
    supplier: 3,
    label_type: LABEL_TYPES.FRONTAL,
    label_type_display: 'Delantera Premium',
    brand_reference: 'Ontalba Tempranillo Ecológico',
    vintage: 2026,
    unit_mesure: UNIT_MESURE.MILLAR,
    unit_mesure_display: 'Millares',
    min_stock_level: '10.00',
    current_stock: '45.50',
    is_low_stock: false,
    is_active: true,
    description: 'Papel reciclado con tinta orgánica',
    created_at: '2026-05-24T12:30:00Z',
    updated_at: '2026-05-24T12:30:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // 🟢 RENDERIZADO E INTEGRIDAD DE DATOS
  // ==========================================

  it('1. Debe pintar los datos clave de identificación en la cabecera del detalle', () => {
    render(
      <LabelDetailView 
        labelData={mockLabelData}
        onEditClick={mockOnEditClick}
        onDeleteClick={mockOnDeleteClick}
        onBack={mockOnBack}
      />
    );

    // Validamos textos deterministas de la sección superior
    expect(screen.getByRole('heading', { name: new RegExp(mockLabelData.name, 'i') })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(mockLabelData.internal_code, 'i'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Posición: ${mockLabelData.label_type_display}`, 'i'))).toBeInTheDocument();
    expect(screen.getByText(/Activo/i)).toBeInTheDocument();
  });

  it('2. Debe renderizar los bloques del grid con las unidades y variables formateadas', () => {
    render(
      <LabelDetailView 
        labelData={mockLabelData}
        onEditClick={mockOnEditClick}
        onDeleteClick={mockOnDeleteClick}
        onBack={mockOnBack}
      />
    );

    // Comprobamos los campos del inventario usando expresiones de concordancia flexible (Regex)
    expect(screen.getByText(/Referencia de Marca/i)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(mockLabelData.brand_reference, 'i'))).toBeInTheDocument();

    expect(screen.getByText(/Añada \/ Cosecha/i)).toBeInTheDocument();
    
    // Validamos que concatena el stock con el string descriptivo en minúsculas (Millares -> millares)
    expect(screen.getByText(/Existencias Actuales/i)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${mockLabelData.current_stock} millares`, 'i'))).toBeInTheDocument();

    expect(screen.getByText(/Descripción Técnica/i)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(mockLabelData.description!, 'i'))).toBeInTheDocument();
  });

  it('3. Debe formatear la fecha ISO del servidor al formato legible local (es-ES)', () => {
    render(
      <LabelDetailView 
        labelData={mockLabelData}
        onEditClick={mockOnEditClick}
        onDeleteClick={mockOnDeleteClick}
        onBack={mockOnBack}
      />
    );

    // "2026-05-24..." debe transformarse a "24 de mayo de 2026"
    expect(screen.getByText(/Información de Registro/i)).toBeInTheDocument();
    expect(screen.getByText(/24 de mayo de 2026/i)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`ID Interno: ${mockLabelData.id}`, 'i'))).toBeInTheDocument();
  });

  // ==========================================
  // 🔘 ACCIONES Y COMUNICACIÓN CON EL CONTENEDOR
  // ==========================================

  it('4. Debe propagar el evento de retorno al accionar los botones de salida', () => {
    render(
      <LabelDetailView 
        labelData={mockLabelData}
        onEditClick={mockOnEditClick}
        onDeleteClick={mockOnDeleteClick}
        onBack={mockOnBack}
      />
    );

    // Escenario A: Botón superior de flecha volver
    fireEvent.click(screen.getByText(/Volver al listado/i));
    expect(mockOnBack).toHaveBeenCalledTimes(1);

    // Escenario B: Botón inferior secundario de cerrar ficha
    fireEvent.click(screen.getByRole('button', { name: /Cerrar Ficha/i }));
    expect(mockOnBack).toHaveBeenCalledTimes(2);
  });

  it('5. Debe emitir la información completa del registro al pulsar el botón de edición o borrado', () => {
    render(
      <LabelDetailView 
        labelData={mockLabelData}
        onEditClick={mockOnEditClick}
        onDeleteClick={mockOnDeleteClick}
        onBack={mockOnBack}
      />
    );

    // Pulsamos en editar datos
    fireEvent.click(screen.getByRole('button', { name: /Editar Datos/i }));
    expect(mockOnEditClick).toHaveBeenCalledWith(mockLabelData);
    expect(mockOnEditClick).toHaveBeenCalledTimes(1);

    // Pulsamos en eliminar ficha
    fireEvent.click(screen.getByRole('button', { name: /Eliminar Ficha/i }));
    expect(mockOnDeleteClick).toHaveBeenCalledWith(mockLabelData);
    expect(mockOnDeleteClick).toHaveBeenCalledTimes(1);
  });
});