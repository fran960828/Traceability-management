import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestQueue } from './requestQueue';

describe('RequestQueue', () => {
  
  beforeEach(() => {
    // Nos aseguramos de que la cola esté limpia antes de cada test.
    // Como la variable failedQueue es privada en el módulo, 
    // llamar a process() es la forma de resetearla.
    RequestQueue.process(new Error('Reset'));
  });

  // --- HAPPY PATH ---

  it('debería ejecutar todos los resolve cuando el proceso es exitoso', () => {
    const resolve1 = vi.fn();
    const resolve2 = vi.fn();
    const reject = vi.fn();
    const mockToken = 'new-access-token';

    // Añadimos dos peticiones a la cola
    RequestQueue.add(resolve1, reject);
    RequestQueue.add(resolve2, reject);

    // Procesamos con éxito
    RequestQueue.process(null, mockToken);

    expect(resolve1).toHaveBeenCalledWith(mockToken);
    expect(resolve2).toHaveBeenCalledWith(mockToken);
    expect(reject).not.toHaveBeenCalled();
  });

  it('debería ejecutar todos los reject cuando el proceso falla', () => {
    const resolve = vi.fn();
    const reject1 = vi.fn();
    const reject2 = vi.fn();
    const mockError = new Error('Refresh failed');

    RequestQueue.add(resolve, reject1);
    RequestQueue.add(resolve, reject2);

    // Procesamos con error
    RequestQueue.process(mockError, null);

    expect(reject1).toHaveBeenCalledWith(mockError);
    expect(reject2).toHaveBeenCalledWith(mockError);
    expect(resolve).not.toHaveBeenCalled();
  });

  // --- EDGE CASES ---

  it('debería vaciar la cola después de procesar', () => {
    const resolve = vi.fn();
    const reject = vi.fn();

    RequestQueue.add(resolve, reject);
    RequestQueue.process(null, 'token');

    // Si volvemos a procesar, no debería llamarse de nuevo a resolve
    // porque la lista debe estar vacía.
    RequestQueue.process(null, 'otro-token');
    
    expect(resolve).toHaveBeenCalledTimes(1); 
  });

  it('no debería explotar si se llama a process() con una cola vacía', () => {
    // Caso: No hay peticiones pero por algún motivo se dispara el process.
    // Simplemente no debe hacer nada y no lanzar excepciones.
    expect(() => {
      RequestQueue.process(null, 'token');
    }).not.toThrow();
  });

  it('debería mantener el orden y la integridad de los argumentos', () => {
    const resolve = vi.fn();
    const complexError = { status: 403, message: 'Forbidden' };

    RequestQueue.add(resolve, (err) => {
      expect(err).toEqual(complexError);
    });

    RequestQueue.process(complexError);
  });
});