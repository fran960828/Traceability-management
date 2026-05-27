// src/modules/products/pages/ProductsPage.tsx
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { FormButton } from '../../shared/components/formInputs';

// Tus 3 contenedores independientes y limpios
import { LabelContainer } from '../components/containers/Label.container';
//import { EnologicalContainer } from '../components/containers/EnologicalContainer';
//import { PackagingContainer } from '../components/containers/PackagingContainer';

import styles from './inventory.pages.module.css';

export const ProductsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Leemos la pestaña activa de la URL, si no hay ninguna, por defecto mostramos 'labels'
  const activeTab = searchParams.get('tab') || 'labels';

  const handleTabChange = (tabName: string) => {
    // Al cambiar de pestaña, actualizamos la URL limpia
    setSearchParams({ tab: tabName });
  };

  return (
    <div className={styles.pageWrapper}>
      
      {/* SUB-LAYOUT DE BOTONES CORPORATIVOS */}
      <div className={styles.tabBar}>
        <FormButton 
          variant={activeTab === 'labels' ? 'primary' : 'secondary'} 
          onClick={() => handleTabChange('labels')}
        >
          Etiquetas (Labels)
        </FormButton>
        
        <FormButton 
          variant={activeTab === 'enological' ? 'primary' : 'secondary'} 
          onClick={() => handleTabChange('enological')}
        >
          Productos Enológicos
        </FormButton>
        
        <FormButton 
          variant={activeTab === 'packaging' ? 'primary' : 'secondary'} 
          onClick={() => handleTabChange('packaging')}
        >
          Embalaje y Packaging
        </FormButton>
      </div>

      {/* RENDERIZADO DINÁMICO TOTALMENTE AISLADO */}
      <div className={styles.containerContent}>
        {activeTab === 'labels' && <LabelContainer />} 
        {/* {activeTab === 'enological' && <EnologicalContainer />} */}
        {/* {activeTab === 'packaging' && <PackagingContainer />} */}
      </div>

    </div>
  );
};