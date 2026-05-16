'use client';

import React from 'react';
import { useApp } from '@/lib/context/AppContext';
import HomeView from '@/components/views/HomeView';

export default function Page() {
  const { 
    products, users, globalCategories, addToCart, currentUser, 
    banners, globalBrandName, activeCategory, setActiveCategory, 
    isLoading 
  } = useApp();

  return (
    <HomeView 
      products={products}
      users={users}
      globalCategories={globalCategories}
      addToCart={addToCart}
      currentUser={currentUser}
      banners={banners}
      globalBrandName={globalBrandName}
      activeCategory={activeCategory}
      setActiveCategory={setActiveCategory}
      isLoading={isLoading}
    />
  );
}
