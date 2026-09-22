"use client";

import React from 'react';
import AppHeader from '@/components/AppHeader';
import PedidosPanel from '@/components/PedidosPanel';
import { useCart } from '@/context/CartContext';

export default function Orders() {
  const { cartCount, setIsCartOpen } = useCart();

  return (
    <>
      <AppHeader
        cartCount={cartCount}
        onCartClick={() => setIsCartOpen(true)}
      />

      <main className="max-w-[720px] mx-auto px-container-margin w-full pt-6 pb-12">
        <PedidosPanel />
      </main>
    </>
  );
}
