// src/modules/inventory/components/forms/__tests__/location.create.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocationForm } from './location.create';
import type { Location } from '../../models/location.schema';

describe('LocationForm - Unit & Structural Integration Tests', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  // Instancia simulada de una ubicación de almacenamiento de la bodega
  const mockLocationData: Location = {
    id: 15,
    name: 'ALMACEN_CENTRAL',
    description: 'Nave de materias primas y vidrios',
    is_active: true,
    created_at: '2026-06-09T14:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===================================================
  // 🟢 SECCIÓN 1: MODOS DE RENDERIZADO (CREAR VS EDITAR)
  // ===================================================

  it('1. Debe arrancar en Modo Creación con los campos limpios y sin bloques de solo lectura', () => {
    render(
      <LocationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    // Comprobamos el botón primario de guardado inicial
    expect(screen.getByRole('button', { name: /Establecer Ubicación/i })).toBeInTheDocument();

    // El bloque ReadOnlyInput no debe pintarse en el DOM al ser un alta nueva
    expect(screen.queryByLabelText(/ID Ubicación Sistema/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Fecha Alta DRF/i)).not.toBeInTheDocument();

    // Verificamos que los inputs arrancan vacíos de fábrica
    expect(screen.getByLabelText(/Nombre \/ Identificador/i)).toHaveValue('');
    expect(screen.getByLabelText(/Descripción Técnica/i)).toHaveValue('');
  });

  it('2. Debe arrancar en Modo Edición hidratando la información previa y bloqueando los datos de auditoría', () => {
    render(
      <LocationForm 
        locationInitialData={mockLocationData} 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );

    // El botón muta semánticamente según la acción destructurada
    expect(screen.getByRole('button', { name: /Actualizar Localización/i })).toBeInTheDocument();

    // Verificamos que los campos fijos automatizados del backend están deshabilitados
    const idInput = screen.getByLabelText(/ID Ubicación Sistema/i);
    const dateInput = screen.getByLabelText(/Fecha Alta DRF/i);
    
    expect(idInput).toBeDisabled();
    expect(idInput).toHaveValue('15');
    
    expect(dateInput).toBeDisabled();
    expect(dateInput).toHaveValue('9/6/2026'); // Transmutación local a es-ES

    // Verificamos que las casillas editables se re-hidrataron correctamente
    expect(screen.getByLabelText(/Nombre \/ Identificador/i)).toHaveValue('ALMACEN_CENTRAL');
    expect(screen.getByLabelText(/Descripción Técnica/i)).toHaveValue('Nave de materias primas y vidrios');
  });

  // ===================================================
  // 🛑 SECCIÓN 2: INTERCEPCIONES DE NEGOCIO (ZOD)
  // ===================================================

  it('3. Debe detener la sumisión y activar la advertencia si el identificador obligatorio está ausente', async () => {
    render(
      <LocationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    // Forzamos el submit haciendo click con el input en blanco
    const submitBtn = screen.getByRole('button', { name: /Establecer Ubicación/i });
    fireEvent.click(submitBtn);

    // Zod y React Hook Form deben inyectar el error de forma asíncrona en el DOM
    expect(await screen.findByText(/El nombre de la ubicación es obligatorio/i)).toBeInTheDocument();

    // El callback jamás debió ser invocado por seguridad estructural
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('4. Debe despachar un payload íntegro y sanitizado si cumple las especificaciones del esquema', async () => {
    render(
      <LocationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    // Simulamos que el operario tipea los nombres de la nueva cámara
    fireEvent.change(screen.getByLabelText(/Nombre \/ Identificador/i), { target: { value: 'BODEGA_CRIANZA' } });
    fireEvent.change(screen.getByLabelText(/Descripción Técnica/i), { target: { value: 'Control higrométrico optimizado para barricas' } });

    // Enviamos el formulario relleno
    const submitBtn = screen.getByRole('button', { name: /Establecer Ubicación/i });
    fireEvent.click(submitBtn);

    // Esperamos a que se resuelva la micro-tarea asíncrona de validación
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    // Validamos la estructura atómica final enviada hacia useDataMutation
    const submittedPayload = mockOnSubmit.mock.calls[0][0];
    expect(submittedPayload.name).toBe('BODEGA_CRIANZA');
    expect(submittedPayload.description).toBe('Control higrométrico optimizado para barricas');
    expect(submittedPayload.is_active).toBe(true); // Default de constantes
  });

  it('5. Debe gatillar el callback onCancel de inmediato al presionar Cancelar', () => {
    render(
      <LocationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});