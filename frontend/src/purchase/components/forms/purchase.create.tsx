// src/modules/purchase/components/forms/PurchaseForm.tsx
import React, { useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  PURCHASE_ORDER_STATUS_LABELS,
  PurchaseOrderFormSchema,
  type PurchaseOrderFormValues,
  type PurchaseOrder,
} from '../../models/purchase.schema';

import {
  FormInput,
  FormSelect,
  FormReadOnlyInput,
  FormButton,
  type ReadOnlyField
} from '../../../shared/components/formInputs';

import { PURCHASE_ORDER_INPUTS_CONFIG, DEFAULT_PURCHASE_ORDER_VALUES } from '../../constants/purchase.constants';
import { useDataTable } from '../../../shared/hooks';
import { SupplierService } from '../../../supplier/services/supplier.service';
import { PackagingService } from '../../../inventory/services/packaging.service';
import { LabelService } from '../../../inventory/services/label.service';
import { EnologicalService } from '../../../inventory/services/enological.service';

// 🟢 Cambiamos la hoja de estilos por la nueva específica del módulo
import styles from './purchase.create.module.css';

export interface PurchaseFormProps {
  productInitialData?: PurchaseOrder;
  onSubmit: (values: PurchaseOrderFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  activeAction?: 'create' | 'edit' | 'clone';
}

export const PurchaseForm: React.FC<PurchaseFormProps> = ({
  productInitialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  activeAction = 'create',
}) => {
  const isEditMode = activeAction === 'edit' && !!productInitialData;

  // =======================================================
  // 🔄 CARGA DE CATÁLOGOS COLECTIVOS
  // =======================================================
  const { data: suppliersData } = useDataTable({ key: 'suppliers-select', fetchFn: SupplierService.getAll });
  const { data: packagingData } = useDataTable({ key: 'pkg-select', fetchFn: PackagingService.getAll });
  const { data: labelsData } = useDataTable({ key: 'lbl-select', fetchFn: LabelService.getAll });
  const { data: enologicalData } = useDataTable({ key: 'eno-select', fetchFn: EnologicalService.getAll });

  const rawSuppliersList = suppliersData?.results || [];
  const supplierOptions = rawSuppliersList.map(s => ({ id: s.id, name: s.name }));
  const packagingOptions = (packagingData?.results || []).map(p => ({ id: p.id, name: `${p.name} (${p.specification})` }));
  const labelOptions = (labelsData?.results || []).map(l => ({ id: l.id, name: l.name }));
  const enologicalOptions = (enologicalData?.results || []).map(e => ({ id: e.id, name: `${e.name} [${e.commercial_format}]` }));
  const statusOptions = Object.entries(PURCHASE_ORDER_STATUS_LABELS).map(([key, value]) => ({
  id: key,
  name: value
}));
  // =======================================================
  // 🔧 ORQUESTACIÓN DEL FORMULARIO
  // =======================================================
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(PurchaseOrderFormSchema) as any,
    defaultValues: DEFAULT_PURCHASE_ORDER_VALUES,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // 🟢 OBSERVADORES MÁGICOS EN TIEMPO REAL
  const selectedSupplierId = useWatch({ control, name: 'supplier' });
  const currentStatus = useWatch({ control, name: 'status' });

  // Averiguamos la categoría del proveedor seleccionado actualmente
  const currentSupplierObj = rawSuppliersList.find(s => String(s.id) === String(selectedSupplierId));
  const supplierCategory = currentSupplierObj?.category_name; 
  // Nota: Si en tu modelo de Supplier el campo se llama 'supplier_type' o similar, cámbialo aquí.
  // Ejemplo de enums esperados del backend: 'PACKAGING', 'LABEL', 'ENOLOGICAL'

  useEffect(() => {
    if (productInitialData) {
      reset({
        supplier: String(productInitialData.supplier),
        status: productInitialData.status,
        date_delivery_expected: productInitialData.date_delivery_expected || '',
        notes: productInitialData.notes || '',
        items: (productInitialData.items || []).map(item => ({
          id: item.id,
          packaging: item.packaging ? String(item.packaging) : '',
          label: item.label ? String(item.label) : '',
          enological: item.enological ? String(item.enological) : '',
          quantity_ordered: item.quantity_ordered,
          quantity_received: item.quantity_received,
          unit_price: String(item.unit_price),
        })),
      });
    } else {
      reset(DEFAULT_PURCHASE_ORDER_VALUES);
    }
  }, [productInitialData, reset]);

  // Limpieza preventiva si el usuario cambia de proveedor a mitad de la edición
  useEffect(() => {
    if (!isEditMode && fields.length > 0) {
      // Si cambia el proveedor, es buena UX vaciar los artículos para evitar inconsistencias de categoría
      remove();
    }
  }, [selectedSupplierId, remove, isEditMode]);

  const readOnlyFields: ReadOnlyField[] = isEditMode && productInitialData
    ? [
        { label: 'Código Único de Pedido', value: productInitialData.order_number },
        { label: 'Fecha Registro Sistema', value: new Date(productInitialData.date_issued).toLocaleString('es-ES') }
      ]
    : [];

  return (
    <form onSubmit={handleSubmit(onSubmit) as any} className={styles.formContainer} noValidate>
      <FormReadOnlyInput fields={readOnlyFields} />

      {/* 🧾 SECCIÓN 1: CABECERA DEL PEDIDO */}
      <h3 className={styles.formTitle}>
        Datos de Cabecera y Distribuidor
      </h3>
      
      <div className={styles.flexGrid}>
        <div className={styles.gridHalf}>
          <FormSelect
            label="Proveedor Homologado *"
            placeholder="Selecciona distribuidor..."
            register={register('supplier')}
            options={supplierOptions}
            error={errors.supplier?.message}
            disabled={isEditMode}
          />
        </div>
        <div className={styles.gridHalf}>
          <FormSelect
            label="Estado de Gestión *"
            placeholder="Selecciona estado..."
            register={register('status')}
            options={statusOptions}
            error={errors.status?.message}
            disabled={currentStatus === 'CLOSED' || currentStatus === 'CANCELLED'}
          />
        </div>

        {PURCHASE_ORDER_INPUTS_CONFIG.map((input) => (
          <div key={input.name} className={input.halfWidth ? styles.gridHalf : styles.gridFull}>
            <FormInput
              label={input.label}
              type={input.type}
              placeholder={input.placeholder}
              register={register(input.name)}
              error={errors[input.name as keyof PurchaseOrderFormValues]?.message}
            />
          </div>
        ))}
      </div>

      {/* 📦 SECCIÓN 2: LÍNEAS COMPACTADAS EN UNA SOLA LÍNEA HORIZONTAL */}
      <h3 className={styles.formTitle} style={{ fontSize: '1.1rem', marginTop: '24px', marginBottom: '16px' }}>
        Líneas de Suministros Solicitados *
      </h3>

      {errors.items?.message && (
        <p className={styles.gridFull} style={{ color: '#ef4444', fontSize: '0.85rem', margin: '-8px 0 16px 0' }}>
          {errors.items?.message}
        </p>
      )}

      {/* Si no se ha escogido distribuidor, bloqueamos amigablemente las líneas */}
      {!selectedSupplierId ? (
        <div className={styles.gridFull} style={{ padding: '20px', textAlign: 'center', color: '#6b7280', backgroundColor: '#f8f9fa', borderRadius: '6px', fontStyle: 'italic' }}>
          Por favor, selecciona primero un Proveedor Homologado para habilitar la carga de materiales de su categoría correspondiente.
        </div>
      ) : (
        fields.map((field, index) => {
          return (
            <div key={field.id} className={styles.itemRow}>
              
              {/* 🟢 DROPDOWN CONDICIONAL EXCLUSIVO SEGÚN LA CATEGORÍA DEL PROVEEDOR */}
              <div>
                {/* Caso A: Suministrador de Acondicionamiento / Vidrios / Corchos */}
                {(supplierCategory === 'PACKAGING PRODUCT' || !supplierCategory) && (
                  <FormSelect
                    label={`Línea #${index + 1} - Artículo`}
                    placeholder="Selecciona botella, corcho, caja..."
                    register={register(`items.${index}.packaging` as const)}
                    options={packagingOptions}
                    error={errors.items?.[index]?.packaging?.message}
                  />
                )}

                {/* Caso B: Suministrador de Artes Gráficas / Etiquetas */}
                {supplierCategory === 'LABEL PRODUCT' && (
                  <FormSelect
                    label={`Línea #${index + 1} - Etiqueta`}
                    placeholder="Selecciona etiqueta frontal, contra..."
                    register={register(`items.${index}.label` as const)}
                    options={labelOptions}
                    error={errors.items?.[index]?.label?.message}
                  />
                )}

                {/* Caso C: Suministrador de Productos Químicos / Enológicos */}
                {supplierCategory === 'ENOLOGICAL PRODUCT' && (
                  <FormSelect
                    label={`Línea #${index + 1} - Compuesto Enológico`}
                    placeholder="Selecciona levadura, clarificante, sulfito..."
                    register={register(`items.${index}.enological` as const)}
                    options={enologicalOptions}
                    error={errors.items?.[index]?.enological?.message}
                  />
                )}
              </div>

              {/* Cantidad Solicitada */}
              <div>
                <FormInput
                  label="Cantidad *"
                  type="number"
                  placeholder="Ej: 5000"
                  register={register(`items.${index}.quantity_ordered` as const, { valueAsNumber: true })}
                  error={errors.items?.[index]?.quantity_ordered?.message}
                />
              </div>

              {/* Precio Unitario */}
              <div>
                <FormInput
                  label="Precio (€/u) *"
                  type="text"
                  placeholder="Ej: 0.25"
                  register={register(`items.${index}.unit_price` as const)}
                  error={errors.items?.[index]?.unit_price?.message}
                />
              </div>

              {/* 🟢 BOTÓN ELIMINAR EN FORMA DE X LIMPIA AL FINAL */}
              <div className={styles.btnRemoveX}>
                <FormButton type="button" variant="danger" onClick={() => remove(index)}>
                          X
                </FormButton>
              </div>
            </div>
          );
        })
      )}

      {/* Botón estructural para añadir ítems */}
      {selectedSupplierId && (
        <div className={styles.flexGrid} style={{ marginTop: '12px' }}>
          <div className={styles.gridFull}>
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => append({ packaging: '', label: '', enological: '', quantity_ordered: 1, quantity_received: 0, unit_price: '' })}
            >
              + Añadir Artículo
            </FormButton>
          </div>
        </div>
      )}

      {/* 🔘 BOTONERA DE ACCIONES DE EMISIÓN */}
      <div className={styles.actionsContainer}>
        <FormButton variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </FormButton>

        <FormButton type="submit" variant="primary" isLoading={isSubmitting} loadingText="Emitiendo Orden...">
          {isEditMode ? 'Actualizar Pedido' : activeAction === 'clone' ? 'Confirmar Clonación' : 'Registrar Orden de Compra'}
        </FormButton>
      </div>
    </form>
  );
};