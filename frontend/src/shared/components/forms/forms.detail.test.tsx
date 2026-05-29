import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenericDetailView } from './forms.detail';
import type { DetailFieldConfig } from '../detailView/DataGridDetail';

describe('GenericDetailView - Shared Unit Tests', () => {
  const mockOnEditClick = vi.fn();
  const mockOnDeleteClick = vi.fn();
  const mockOnBack = vi.fn();

  // Tipado ficticio para simular cualquier modelo de negocio (ej: un material de embalaje)
  interface DummyItem {
    id: number;
    code: string;
    description: string;
  }

  const mockData: DummyItem = {
    id: 99,
    code: 'EMB-99',
    description: 'Cajas de cartón reforzado para exportación',
  };

  const mockFields: DetailFieldConfig[] = [
    { label: 'Descripción Técnica', value: mockData.description, fullWidth: true },
    { label: 'Identificador Interno', value: String(mockData.id) },
  ];

  const baseProps = {
    data: mockData,
    badgeLabel: 'Tipo de Material:',
    badgeValue: 'Embalaje',
    titleLabel: 'Ficha del Registro:',
    titleValue: 'Cajas de Exportación',
    codeLabel: 'Código de barra único',
    codeValue: mockData.code,
    isActive: true,
    fields: mockFields,
    onEditClick: mockOnEditClick,
    onDeleteClick: mockOnDeleteClick,
    onBack: mockOnBack,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // 🟢 HAPPY PATHS (RENDIMIENTO E INTERFAZ)
  // ==========================================

  it('1. Debe pintar los metadatos de la cabecera dinámica de forma estructurada', () => {
    render(<GenericDetailView {...baseProps} />);

    // Validamos el layout del encabezado usando concordancias flexibles
    expect(screen.getByText(new RegExp(`${baseProps.badgeLabel} ${baseProps.badgeValue}`, 'i'))).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: new RegExp(`${baseProps.titleLabel} ${baseProps.titleValue}`, 'i') })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${baseProps.codeLabel}:`, 'i'))).toBeInTheDocument();
    expect(screen.getByText(baseProps.codeValue)).toBeInTheDocument();
  });

  it('2. Debe alternar visualmente el texto de los badges de estado según la prop isActive', () => {
    // Escenario A: Registro Activo
    const { rerender } = render(<GenericDetailView {...baseProps} isActive={true} />);
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.queryByText('Inactivo')).not.toBeInTheDocument();

    // Escenario B: Registro Inactivo
    rerender(<GenericDetailView {...baseProps} isActive={false} />);
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
    expect(screen.queryByText('Activo')).not.toBeInTheDocument();
  });

  it('3. Debe renderizar los pares clave-valor inyectados en el array de campos (Grid)', () => {
    render(<GenericDetailView {...baseProps} />);

    // Comprobamos que las etiquetas y valores mapeados del subcomponente se pintan en el árbol DOM
    expect(screen.getByText('Descripción Técnica')).toBeInTheDocument();
    expect(screen.getByText(mockData.description)).toBeInTheDocument();
    expect(screen.getByText('Identificador Interno')).toBeInTheDocument();
    expect(screen.getByText(String(mockData.id))).toBeInTheDocument();
  });

  // ==========================================
  // 🔘 ACCIONES Y DESPACHO DE DATOS (EVENTOS)
  // ==========================================

  it('4. Debe disparar la función de retorno al hacer clic en los controles de cierre o salida', () => {
    render(<GenericDetailView {...baseProps} />);

    // Control 1: Botón superior con flecha de retorno
    fireEvent.click(screen.getByText(/Volver al listado/i));
    expect(mockOnBack).toHaveBeenCalledTimes(1);

    // Control 2: Botón inferior secundario "Cerrar Ficha"
    fireEvent.click(screen.getByRole('button', { name: /Cerrar Ficha/i }));
    expect(mockOnBack).toHaveBeenCalledTimes(2);
  });

  it('5. Debe propagar el payload de datos original con el tipado exacto al pulsar Editar o Eliminar', () => {
    render(<GenericDetailView {...baseProps} />);

    // Flujo de Edición: Debe emitir el ítem hacia el orquestador
    fireEvent.click(screen.getByRole('button', { name: /Editar Datos/i }));
    expect(mockOnEditClick).toHaveBeenCalledWith(mockData);
    expect(mockOnEditClick).toHaveBeenCalledTimes(1);

    // Flujo de Eliminación: Debe emitir el ítem hacia el modal de confirmación de borrado
    fireEvent.click(screen.getByRole('button', { name: /Eliminar Ficha/i }));
    expect(mockOnDeleteClick).toHaveBeenCalledWith(mockData);
    expect(mockOnDeleteClick).toHaveBeenCalledTimes(1);
  });
});