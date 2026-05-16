'use client';

import { useApp } from '@/lib/context/AppContext';
import HomeView from '@/components/views/HomeView';

export default function CategoryClient() {
  const { 
    products, 
    users, 
    globalCategories, 
    isLoading, 
    addToCart, 
    currentUser, 
    banners, 
    globalBrandName, 
    activeCategory, 
    setActiveCategory,
    onRecordSale 
  } = useApp();

  return (
    <HomeView 
      products={products}
      users={users}
      globalCategories={globalCategories}
      isLoading={isLoading}
      addToCart={addToCart}
      currentUser={currentUser}
      banners={banners}
      globalBrandName={globalBrandName}
      activeCategory={activeCategory}
      setActiveCategory={setActiveCategory}
      onRecordSale={onRecordSale}
    />
  );
}
