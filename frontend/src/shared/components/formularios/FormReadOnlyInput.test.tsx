import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FormReadOnlyInput, type ReadOnlyField } from './FormReadOnlyInput';

describe('FormReadOnlyInput Component - Unit Tests', () => {

  it('1. Debe retornar nulo y no renderizar nada si el array de fields está vacío o es nulo', () => {
    // Probamos pasándole un array vacío
    const { container: containerEmpty } = render(<FormReadOnlyInput fields={[]} />);
    expect(containerEmpty.firstChild).toBeNull();

    // Probamos pasándole una variable undefined (forzando el tipo por seguridad)
    const { container: containerNull } = render(<FormReadOnlyInput fields={undefined as any} />);
    expect(containerNull.firstChild).toBeNull();
  });

  it('2. Debe renderizar correctamente múltiples campos respetando sus etiquetas y valores', () => {
    const mockFields: ReadOnlyField[] = [
      { label: 'ID Interno', value: 104 },
      { label: 'Código de Proveedor', value: 'PROV-2026-004' },
    ];

    render(<FormReadOnlyInput fields={mockFields} />);

    // A. Comprobamos que las etiquetas descriptivas aparecen en pantalla
    expect(screen.getByText('ID Interno')).toBeInTheDocument();
    expect(screen.getByText('Código de Proveedor')).toBeInTheDocument();

    // B. Comprobamos que los inputs nativos contienen los valores asignados de la bodega
    expect(screen.getByDisplayValue('104')).toBeInTheDocument();
    expect(screen.getByDisplayValue('PROV-2026-004')).toBeInTheDocument();
  });

  it('3. Debe forzar que todos los inputs renderizados estén deshabilitados de forma nativa (disabled)', () => {
    const mockFields: ReadOnlyField[] = [
      { label: 'Auditoría', value: 'Sistema Automatizado' },
    ];

    render(<FormReadOnlyInput fields={mockFields} />);

    // Capturamos el input buscando semánticamente por su valor en pantalla
    const inputElement = screen.getByDisplayValue('Sistema Automatizado');

    // Verificamos que el usuario no puede escribir ni alterar el elemento bajo ningún concepto
    expect(inputElement).toBeDisabled();
    expect(inputElement).toHaveAttribute('type', 'text');
  });

  it('4. Debe admitir valores numéricos y transformarlos a strings legibles en el input sin romperse', () => {
    const mockFields: ReadOnlyField[] = [
      { label: 'Código Numérico', value: 0 }, // Probamos con el cero, que suele dar falsos negativos en JS
    ];

    render(<FormReadOnlyInput fields={mockFields} />);

    const inputElement = screen.getByDisplayValue('0');
    expect(inputElement).toBeInTheDocument();
    expect(inputElement).toBeDisabled();
  });
});