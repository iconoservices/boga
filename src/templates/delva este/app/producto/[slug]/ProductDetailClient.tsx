'use client';

import React from 'react';
import { useApp } from '@/lib/context/AppContext';
import ProductDetailView from '@/components/views/ProductDetailView';

export default function ProductDetailClient({ slug }: { slug: string }) {
  const { 
    products, users, addToCart, getWhatsAppLink, cart, currentUser 
  } = useApp();

  return (
    <ProductDetailView 
      products={products}
      users={users}
      addToCart={addToCart}
      getWhatsAppLink={getWhatsAppLink}
      cartCount={cart.length}
      currentUser={currentUser}
      isLoading={products.length === 0}
    />
  );
}
