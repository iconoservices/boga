'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface StoreSettings {
  /** Mostrar la pantalla de bienvenida (splash) o ir directo al menú */
  showSplash: boolean;
  /** Mostrar la foto hero en el splash o solo el nombre */
  showHeroImage: boolean;
  /** Mostrar imágenes de los productos en el catálogo */
  showProductImages: boolean;
  /** URL personalizada de la imagen hero (vacío = usar la del config) */
  customHeroUrl: string;
  /** Usar imagen del primer producto como banner de categoría (automatico) */
  useCategoryFeaturedImage: boolean;
  /** URLs de banners personalizados por categoría (slug_categoria -> url) */
  categoryBannerUrls: Record<string, string>;
  /** Títulos personalizados por categoría para el banner */
  categoryBannerTitles: Record<string, string>;
  /** Descripciones personalizadas por categoría para el banner */
  categoryBannerDescs: Record<string, string>;
  /** Precio personalizado por categoría para el banner */
  categoryBannerPrices: Record<string, string>;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  showSplash: true,
  showHeroImage: true,
  showProductImages: true,
  customHeroUrl: '',
  useCategoryFeaturedImage: true,
  categoryBannerUrls: {},
  categoryBannerTitles: {},
  categoryBannerDescs: {},
  categoryBannerPrices: {},
};

type AllSettings = Record<string, StoreSettings>;

interface StoreSettingsContextType {
  getSettings: (slug: string) => StoreSettings;
  updateSetting: <K extends keyof StoreSettings>(slug: string, key: K, value: StoreSettings[K]) => void;
}

const StoreSettingsContext = createContext<StoreSettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'boga_store_settings';

export function StoreSettingsProvider({ children }: { children: React.ReactNode }) {
  const [allSettings, setAllSettings] = useState<AllSettings>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setAllSettings(JSON.parse(raw));
    } catch {}
  }, []);

  const getSettings = (slug: string): StoreSettings => ({
    ...DEFAULT_SETTINGS,
    ...(allSettings[slug] || {}),
  });

  const updateSetting = <K extends keyof StoreSettings>(
    slug: string,
    key: K,
    value: StoreSettings[K]
  ) => {
    setAllSettings((prev) => {
      const next: AllSettings = {
        ...prev,
        [slug]: { ...DEFAULT_SETTINGS, ...(prev[slug] || {}), [key]: value },
      };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  return (
    <StoreSettingsContext.Provider value={{ getSettings, updateSetting }}>
      {children}
    </StoreSettingsContext.Provider>
  );
}

export function useStoreSettings() {
  const ctx = useContext(StoreSettingsContext);
  if (!ctx) throw new Error('useStoreSettings must be used within StoreSettingsProvider');
  return ctx;
}
