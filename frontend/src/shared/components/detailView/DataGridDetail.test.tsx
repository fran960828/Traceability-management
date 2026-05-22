import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DataGridDetail, type DetailFieldConfig } from './DataGridDetail';

describe('DataGridDetail Component - Unit Tests', () => {

  it('1. Debe renderizar etiquetas y valores de texto plano de forma estándar', () => {
    const mockFields: DetailFieldConfig[] = [
      { label: 'NIF / CIF', value: 'B12345678' },
      { label: 'Teléfono', value: '654564664' },
    ];

    render(<DataGridDetail fields={mockFields} />);

    // Verificamos que las etiquetas descriptivas aparecen correctamente
    expect(screen.getByText('NIF / CIF')).toBeInTheDocument();
    expect(screen.getByText('Teléfono')).toBeInTheDocument();

    // Verificamos que los valores se pintan en sus casillas
    expect(screen.getByText('B12345678')).toBeInTheDocument();
    expect(screen.getByText('654564664')).toBeInTheDocument();

    // Comprobamos que un valor estándar tiene la clase CSS correspondiente
    const valueElement = screen.getByText('B12345678');
    expect(valueElement.className).toContain('cardValue');
  });

  it('2. Debe inyectar la clase fullWidth si la configuración del campo lo requiere', () => {
    const mockFields: DetailFieldConfig[] = [
      { label: 'Dirección de la Sede', value: 'Calle de la Bodega, Km 4', fullWidth: true },
    ];

    render(<DataGridDetail fields={mockFields} />);

    // Buscamos el contenedor de la tarjeta (el elemento padre del label)
    const labelElement = screen.getByText('Dirección de la Sede');
    const cardContainer = labelElement.parentElement;

    expect(cardContainer).toBeInTheDocument();
    // Verificamos que el contenedor sumó la clase estructural para ocupar el 100% del ancho
    expect(cardContainer?.className).toContain('infoCard');
    expect(cardContainer?.className).toContain('fullWidth');
  });

  it('3. Debe aplicar las clases metaCard y metaValue cuando el flag isMeta esté activo', () => {
    const mockFields: DetailFieldConfig[] = [
      { label: 'Información de Registro', value: 'Dado de alta por enólogo', isMeta: true },
    ];

    render(<DataGridDetail fields={mockFields} />);

    const labelElement = screen.getByText('Información de Registro');
    const cardContainer = labelElement.parentElement;
    const valueElement = screen.getByText('Dado de alta por enólogo');

    // A. El contenedor de la tarjeta debe mutar al estilo metaCard (sin bordes, línea discontinua)
    expect(cardContainer?.className).toContain('metaCard');

    // B. El texto del valor debe adquirir la clase metaValue (fuente más pequeña, gris e itálica)
    expect(valueElement.className).toContain('metaValue');
    expect(valueElement.className).not.toContain('cardValue');
  });

  it('4. Debe renderizar elementos JSX complejos (ReactNode) inyectados como valor', () => {
    const mockFields: DetailFieldConfig[] = [
      { 
        label: 'Código de Sistema', 
        value: <code data-testid="custom-jsx">PROV-2026-XYZ</code> 
      },
    ];

    render(<DataGridDetail fields={mockFields} />);

    expect(screen.getByText('Código de Sistema')).toBeInTheDocument();
    
    // Capturamos el elemento mediante el testid para demostrar que React montó la etiqueta <code> real
    const jsxElement = screen.getByTestId('custom-jsx');
    expect(jsxElement).toBeInTheDocument();
    expect(jsxElement.tagName).toBe('CODE');
    expect(jsxElement).toHaveTextContent('PROV-2026-XYZ');
  });
});