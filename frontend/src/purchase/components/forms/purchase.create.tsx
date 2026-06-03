// src/modules/purchase/components/forms/PurchaseForm.tsx
import React, { useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
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

import styles from '../../../supplier/components/forms/Supplier.create.module.css';

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

  const supplierOptions = (suppliersData?.results || []).map(s => ({ id: s.id, name: s.name }));
  const packagingOptions = (packagingData?.results || []).map(p => ({ id: p.id, name: `${p.name} (${p.specification})` }));
  const labelOptions = (labelsData?.results || []).map(l => ({ id: l.id, name: l.name }));
  const enologicalOptions = (enologicalData?.results || []).map(e => ({ id: e.id, name: `${e.name} [${e.commercial_format}]` }));

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

  const watchedItems = useWatch({ control, name: 'items' });

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

  const readOnlyFields: ReadOnlyField[] = isEditMode && productInitialData
    ? [
        { label: 'Código Único de Pedido', value: productInitialData.order_number },
        { label: 'Fecha Registro Sistema', value: new Date(productInitialData.date_issued).toLocaleString('es-ES') }
      ]
    : [];

  return (
    <form onSubmit={handleSubmit(onSubmit) as any} className={styles.formContainer} noValidate>
      <h2 className={styles.formTitle}>
        {isEditMode ? 'Modificar Orden de Compra' : activeAction === 'clone' ? 'Clonación de Pedido Recurrente' : 'Emitir Orden de Compra'}
      </h2>

      <FormReadOnlyInput fields={readOnlyFields} />

      {/* 🧾 SECCIÓN 1: CABECERA DEL PEDIDO */}
      <h3 className={styles.formTitle} style={{ fontSize: '1.1rem', marginBottom: '16px' }}>
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

      {/* 📦 SECCIÓN 2: LÍNEAS DINÁMICAS SIN INLINE STYLES */}
      <h3 className={styles.formTitle} style={{ fontSize: '1.1rem', marginTop: '24px', marginBottom: '16px' }}>
        Líneas de Suministros Solicitados *
      </h3>

      {errors.items?.message && (
        <p className={styles.gridFull} style={{ color: '#ef4444', fontSize: '0.85rem', margin: '-8px 0 16px 0' }}>
          {errors.items?.message}
        </p>
      )}

      {fields.map((field, index) => {
        const currentValues = watchedItems?.[index] || {};
        const hasPackaging = !!currentValues.packaging;
        const hasLabel = !!currentValues.label;
        const hasEnological = !!currentValues.enological;

        return (
          <div key={field.id} className={styles.flexGrid} style={{ borderBottom: '1px solid #f1f3f5', paddingBottom: '16px', marginBottom: '16px' }}>
            
            {/* Columna de Selección de Artículo (Ancho completo para albergar los 3 subtipos cómodamente) */}
            <div className={styles.gridFull}>
              <div className={styles.flexGrid}>
                <div className={styles.gridHalf} style={{ minWidth: '220px' }}>
                  <FormSelect
                    label={`Línea #${index + 1} - Material de Acondicionamiento`}
                    placeholder="Botella, corcho, caja, cápsula..."
                    register={register(`items.${index}.packaging` as const)}
                    options={packagingOptions}
                    disabled={hasLabel || hasEnological}
                  />
                </div>
                <div className={styles.gridHalf} style={{ minWidth: '220px' }}>
                  <FormSelect
                    label="Material de Etiquetado"
                    placeholder="Frontal, contra, tirilla DOP..."
                    register={register(`items.${index}.label` as const)}
                    options={labelOptions}
                    disabled={hasPackaging || hasEnological}
                  />
                </div>
                <div className={styles.gridFull}>
                  <FormSelect
                    label="Material Enológico"
                    placeholder="Sulfitos, levaduras, clarificantes..."
                    register={register(`items.${index}.enological` as const)}
                    options={enologicalOptions}
                    disabled={hasPackaging || hasLabel}
                  />
                </div>
              </div>
              {errors.items?.[index]?.packaging?.message && (
                <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.items?.[index]?.packaging?.message}</span>
              )}
            </div>

            {/* Campos de Métricas de Compra (Mitad de ancho cada uno para cuadrar en paralelo) */}
            <div className={styles.gridHalf}>
              <FormInput
                label="Cantidad Solicitada *"
                type="number"
                placeholder="Ej: 5000"
                register={register(`items.${index}.quantity_ordered` as const, { valueAsNumber: true })}
                error={errors.items?.[index]?.quantity_ordered?.message}
              />
            </div>

            <div className={styles.gridHalf}>
              <FormInput
                label="Precio Unitario Pactado (€) *"
                type="text"
                placeholder="Ej: 0.2500"
                register={register(`items.${index}.unit_price` as const)}
                error={errors.items?.[index]?.unit_price?.message}
              />
            </div>

            {/* Botón de Eliminación de Fila */}
            <div className={styles.gridFull} style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <FormButton
                type="button"
                variant="secondary"
                onClick={() => remove(index)}
              >
                Remover Línea #{index + 1}
              </FormButton>
            </div>
          </div>
        );
      })}

      {/* Botón estructural para añadir ítems */}
      <div className={styles.flexGrid}>
        <div className={styles.gridFull}>
          <FormButton
            type="button"
            variant="secondary"
            onClick={() => append({ packaging: '', label: '', enological: '', quantity_ordered: 1, quantity_received: 0, unit_price: '' })}
          >
            + Añadir Línea de Suministro
          </FormButton>
        </div>
      </div>

      {/* 🔘 ACCIONES DE EMISIÓN FINAL */}
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