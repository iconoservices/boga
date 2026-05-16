'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface DemoContextType {
  showDemoProducts: Record<string, boolean>;
  toggleDemoProducts: (slug: string) => void;
  isDemoVisible: (slug: string) => boolean;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [showDemoProducts, setShowDemoProducts] = useState<Record<string, boolean>>({});

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('boga_demo_products');
      if (stored) {
        setShowDemoProducts(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const toggleDemoProducts = (slug: string) => {
    setShowDemoProducts((prev) => {
      const next = { ...prev, [slug]: !isDemoVisible(slug, prev) };
      try { localStorage.setItem('boga_demo_products', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const isDemoVisible = (slug: string, state = showDemoProducts) =>
    state[slug] !== false; // default ON

  return (
    <DemoContext.Provider value={{ showDemoProducts, toggleDemoProducts, isDemoVisible }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within DemoProvider');
  return ctx;
}
