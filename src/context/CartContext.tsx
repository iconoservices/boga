"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  name: string;
  price: number;
  quantity: number;
  img: string;
}

interface CartContextType {
  cartItems: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: any) => void;
  updateQuantity: (name: string, delta: number) => void;
  removeItem: (name: string) => void;
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const addToCart = (product: any, qty: number = 1) => {
    const priceStr = product.price || product.price;
    const price = typeof priceStr === 'string' 
      ? parseFloat(priceStr.replace('S/ ', '').replace('S/. ', '')) 
      : priceStr;
    
    setCartItems(prev => {
      const productName = product.title || product.name;
      const productImage = product.image || product.img;
      const existing = prev.find(item => item.name === productName);
      if (existing) {
        return prev.map(item => 
          item.name === productName 
            ? { ...item, quantity: item.quantity + qty } 
            : item
        );
      }
      return [...prev, { name: productName, price: price, quantity: qty, img: productImage }];
    });
  };

  const updateQuantity = (name: string, delta: number) => {
    setCartItems(prev => {
      return prev.map(item => {
        if (item.name === name) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      });
    });
  };

  const removeItem = (name: string) => {
    setCartItems(prev => prev.filter(item => item.name !== name));
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      isCartOpen,
      setIsCartOpen,
      addToCart,
      updateQuantity,
      removeItem,
      cartCount,
      cartTotal
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
