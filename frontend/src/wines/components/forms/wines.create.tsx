import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { 
  WineFormSchema, 
  type WineFormValues, 
  type WineMaterial, 
  APPELLATION_TYPES, 
  WINE_TYPES, 
  AGING_CATEGORIES 
} from '../../models/wines.schema';

import { 
  FormInput, 
  FormSelect, 
  FormCheckbox, 
  FormReadOnlyInput, 
  FormButton, 
  type ReadOnlyField 
} from '../../../shared/components/formInputs'; 

import { DEFAULT_WINE_VALUES, WINE_INPUTS_CONFIG } from '../../constants/wines.constants';
import styles from '../../../supplier/components/forms/Supplier.create.module.css'; 
import { useDataTable } from '../../../shared/hooks';

// Componentes externos de inventario para alimentar los selectores del escandallo
import { PackagingService } from '../../../inventory/services/packaging.service';
import { LabelService } from '../../../inventory/services/label.service';
import type { PackagingPaginationResponse } from '../../../inventory/models/packaging.schema';
import type { LabelPaginationResponse } from '../../../inventory/models/label.schema';

export interface WineFormProps {
  productInitialData?: WineMaterial;
  onSubmit: (values: WineFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  activeAction?: 'create' | 'edit' | 'clone';
}

export const WineForm: React.FC<WineFormProps> = ({
  productInitialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  activeAction = 'create',
}) => {
  const isEditMode = activeAction === 'edit' && !!productInitialData;

  // =======================================================
  // 🔄 CARGA DE CATÁLOGOS CRUZADOS PARA EL ESCANDALLO
  // =======================================================

  // 1. Envases principales (Filtrados implicitamente o cargados de forma global)
  const { data: packagingData, isLoading: isLoadingPkg } = useDataTable<PackagingPaginationResponse>({
    key: 'packaging-selects',
    fetchFn: PackagingService.getAll,
  });

  // 2. Etiquetas y precintos de la bodega
  const { data: labelsData, isLoading: isLoadingLbl } = useDataTable<LabelPaginationResponse>({
    key: 'labels-selects',
    fetchFn: LabelService.getAll,
  });

  const allMaterials = packagingData?.results || [];
  const allLabels = labelsData?.results || [];

  // Mapeamos los materiales segregando por tipo según los limit_choices_to de Django
  const containerOptions = allMaterials
    .filter(m => ['VIDRIO', 'BIB', 'PLASTICO'].includes(m.packaging_type))
    .map(m => ({ id: m.id, name: `${m.name} (${m.specification})` }));

  const corkOptions = allMaterials
    .filter(m => m.packaging_type === 'CIERRE')
    .map(m => ({ id: m.id, name: m.name }));

  const capsuleOptions = allMaterials
    .filter(m => m.packaging_type === 'CAPSULA')
    .map(m => ({ id: m.id, name: m.name }));

  const frontLabelOptions = allLabels
    .filter(l => l.label_type === 'FRONTAL')
    .map(l => ({ id: l.id, name: `${l.name} [Añada: ${l.vintage}]` }));

  const backLabelOptions = allLabels
    .filter(l => l.label_type === 'CONTRA')
    .map(l => ({ id: l.id, name: `${l.name} [Añada: ${l.vintage}]` }));

  const dopSealOptions = allLabels
    .filter(l => l.label_type === 'TIRILLA')
    .map(l => ({ id: l.id, name: l.name }));

  // =======================================================
  // 📊 MAPEO DE ENUMS PROPIOS DE LA FICHA TÉCNICA
  // =======================================================
  const appellationOptions = Object.values(APPELLATION_TYPES).map(t => ({ id: t, name: t }));
  const wineTypeOptions = Object.values(WINE_TYPES).map(t => ({ id: t, name: t }));
  const agingOptions = Object.values(AGING_CATEGORIES).map(t => ({ id: t, name: t.replace('_', ' ') }));

  // =======================================================
  // 🔧 ORQUESTACIÓN DEL FORMULARIO CON ZOD
  // =======================================================
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WineFormValues>({
    resolver: zodResolver(WineFormSchema),
    defaultValues: DEFAULT_WINE_VALUES,
  });

  // Re-hidratación limpia ante cargas iniciales o clonación
  useEffect(() => {
    reset(productInitialData ? productInitialData : DEFAULT_WINE_VALUES);
  }, [productInitialData, reset]);

  // Bloque Informativo Automatizado (ReadOnly)
  const readOnlyFields: ReadOnlyField[] = isEditMode && productInitialData
    ? [
        { label: 'ID Sistema', value: productInitialData.id },
        { label: 'Código Único WN', value: productInitialData.internal_code }
      ]
    : [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.formContainer} noValidate>
      <h2 className={styles.formTitle}>
        {isEditMode ? 'Modificar Ficha de Vino' : activeAction === 'clone' ? 'Clonar Ficha de Vino (Nueva Añada)' : 'Registrar Nuevo Vino'}
      </h2>

      <FormReadOnlyInput fields={readOnlyFields} />

      {/* 🍇 BLOQUE 1: ATRIBUTOS LÍQUIDOS Y CLASIFICACIÓN */}
      <h3 style={{ margin: '16px 0 8px 0', borderBottom: '1px solid #eee', paddingBottom: '4px', fontSize: '1.1rem' }}>
        Datos Técnicos del Vino
      </h3>
      <div className={styles.flexGrid}>
        {WINE_INPUTS_CONFIG.map((input) => (
          <div 
            key={input.name} 
            className={input.halfWidth ? styles.gridHalf : styles.gridFull}
          >
            <FormInput
              label={input.label}
              type={input.type}
              placeholder={input.placeholder}
              register={register(input.name, input.name === 'vintage' ? { valueAsNumber: true } : {})}
              error={errors[input.name]?.message}
            />
          </div>
        ))}

        <div className={styles.gridHalf}>
          <FormSelect
            label="Mención de Calidad *"
            placeholder="Selecciona clasificación..."
            register={register('appellation_type')}
            options={appellationOptions}
            error={errors.appellation_type?.message}
          />
        </div>

        <div className={styles.gridHalf}>
          <FormSelect
            label="Tipo de Vino *"
            placeholder="Selecciona tipología..."
            register={register('wine_type')}
            options={wineTypeOptions}
            error={errors.wine_type?.message}
          />
        </div>

        <div className={styles.gridHalf}>
          <FormSelect
            label="Categoría de Envejecimiento *"
            placeholder="Selecciona crianza..."
            register={register('aging_category')}
            options={agingOptions}
            error={errors.aging_category?.message}
          />
        </div>
      </div>

      {/* 📦 BLOQUE 2: COMPOSICIÓN DEL ESCANDALLO (PACKAGING Y ETIQUETAS) */}
      <h3 style={{ margin: '24px 0 8px 0', borderBottom: '1px solid #eee', paddingBottom: '4px', fontSize: '1.1rem' }}>
        Configuración del Escandallo (Materiales por Defecto)
      </h3>
      <div className={styles.flexGrid}>
        
        <div className={styles.gridHalf}>
          <FormSelect
            label="Envase Principal / Botella *"
            placeholder="Selecciona contenedor..."
            register={register('default_container')}
            options={containerOptions}
            error={errors.default_container?.message}
            isLoading={isLoadingPkg}
          />
        </div>

        <div className={styles.gridHalf}>
          <FormSelect
            label="Tipo de Cierre / Tapón"
            placeholder="Ninguno o selecciona cierre..."
            register={register('default_cork')}
            options={corkOptions}
            error={errors.default_cork?.message}
            isLoading={isLoadingPkg}
          />
        </div>

        <div className={styles.gridHalf}>
          <FormSelect
            label="Cápsula de Botella"
            placeholder="Ninguna o selecciona cápsula..."
            register={register('default_capsule')}
            options={capsuleOptions}
            error={errors.default_capsule?.message}
            isLoading={isLoadingPkg}
          />
        </div>

        <div className={styles.gridHalf}>
          <FormSelect
            label="Etiqueta Frontal Asignada"
            placeholder="Ninguna o selecciona frontal..."
            register={register('default_front_label')}
            options={frontLabelOptions}
            error={errors.default_front_label?.message}
            isLoading={isLoadingLbl}
          />
        </div>

        <div className={styles.gridHalf}>
          <FormSelect
            label="Contraetiqueta Asignada"
            placeholder="Ninguna o selecciona contra..."
            register={register('default_back_label')}
            options={backLabelOptions}
            error={errors.default_back_label?.message}
            isLoading={isLoadingLbl}
          />
        </div>

        <div className={styles.gridHalf}>
          <FormSelect
            label="Precinto / Tirilla DOP de Garantía"
            placeholder="Ninguno o selecciona tirilla..."
            register={register('default_dop_seal')}
            options={dopSealOptions}
            error={errors.default_dop_seal?.message}
            isLoading={isLoadingLbl}
          />
        </div>
      </div>

      <div style={{ marginTop: '16px' }}>
        <FormCheckbox
          label="Ficha de vino activa disponible para programar órdenes de embotellado y ventas"
          register={register('is_active')}
          error={errors.is_active?.message}
        />
      </div>

      {/* BOTONERA DE SEGURIDAD OPERATIVA */}
      <div className={styles.actionsContainer} style={{ marginTop: '24px' }}>
        <FormButton variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </FormButton>
  
        <FormButton type="submit" variant="primary" isLoading={isSubmitting} loadingText="Guardando Ficha...">
          {isEditMode ? 'Actualizar Ficha Técnica' : activeAction === 'clone' ? 'Confirmar Nueva Añada' : 'Crear Ficha de Vino'}
        </FormButton>
      </div>
    </form>
  );
};