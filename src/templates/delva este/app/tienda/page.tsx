'use client';
import React, { Suspense } from 'react';
import { useApp } from '@/lib/context/AppContext';
import ShopView from '@/components/views/ShopView';
import { SOCIAL_ICONS } from '@/lib/assets/icons';

export default function Page() {
  const { 
    products, users, globalCategories, addToCart, currentUser, 
    activeCategory, setActiveCategory, searchTerm, setSearchTerm,
    setEditingProduct, globalSocialLinks, getWhatsAppLink, alertAction, confirmAction
  } = useApp();

  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Cargando tienda...</div>}>
      <ShopView 
        products={products}
        users={users}
        globalCategories={globalCategories}
        addToCart={addToCart}
        currentUser={currentUser}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setEditingProduct={setEditingProduct}
        globalSocialLinks={globalSocialLinks}
        SOCIAL_ICONS={SOCIAL_ICONS}
        compressImage={async () => ""} 
        alertAction={alertAction}
        confirmAction={(t: string, m: string, c: () => void) => confirmAction(t, m, c)}
        globalBrandName="DELVA"
        getWhatsAppLink={getWhatsAppLink}
      />
    </Suspense>
  );
}
