import { createContext, useContext, type ReactNode, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

interface ModalContextType {
  activeAction: string | null; // Ej: 'create', 'edit', 'delete'
  activeId: string | null;     // El ID del registro que estamos manipulando
  openModal: (action: string, id?: string | number) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. Extraemos los parámetros de la URL
  const activeAction = searchParams.get("action");
  const activeId = searchParams.get("id");

  // 2. Función para abrir el modal (añade parámetros a la URL)
  const openModal = useCallback((action: string, id?: string | number) => {
    const params = new URLSearchParams(searchParams);
    params.set("action", action);
    if (id) {
      params.set("id", id.toString());
    } else {
      params.delete("id"); // Limpiamos el ID si es una creación nueva
    }
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  // 3. Función para cerrar el modal (limpia los parámetros)
  const closeModal = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete("action");
    params.delete("id");
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const value = useMemo(
    () => ({ activeAction, activeId, openModal, closeModal }),
    [activeAction, activeId, openModal, closeModal]
  );

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error("useModal must be used within ModalProvider");
  return context;
};