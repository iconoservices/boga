import type { StoreTheme } from './templates.config';

export interface ColorPreset {
  id: string;
  name: string;
  /** Color solido para pintar el swatch del selector, no se guarda en la tienda. */
  swatch: string;
  theme: StoreTheme;
}

/**
 * Paletas de color con nombre, pensadas por rubro, independientes de la
 * plantilla visual elegida (Menú Directo, Inicio con Catálogo, etc. pueden
 * llevar cualquiera de estos colores). Asi un comercio elige "look" (la
 * plantilla) y "color" (esto) por separado, en vez de que el color venga
 * pegado a la plantilla.
 */
export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'marino',
    name: 'Marino',
    swatch: '#0284c7',
    theme: {
      primary: '#0284c7', onPrimary: '#ffffff', primaryContainer: '#075985',
      secondary: '#0e7490', secondaryContainer: '#cffafe',
      background: '#f7fbfd', surface: '#ffffff', surfaceContainer: '#e6f4fa',
      surfaceContainerLow: '#f0f8fc', surfaceContainerLowest: '#ffffff', surfaceContainerHigh: '#dbeefa',
      onBackground: '#0c2733', onSurface: '#0c2733', onSurfaceVariant: '#3d5a68',
      outlineVariant: '#c3dde8',
      fontHeadline: "'Outfit', sans-serif", fontBody: "'Outfit', sans-serif", fontLabel: "'Outfit', sans-serif",
    },
  },
  {
    id: 'brasa',
    name: 'Brasa',
    swatch: '#a43800',
    theme: {
      primary: '#a43800', onPrimary: '#ffffff', primaryContainer: '#ffdbce',
      secondary: '#7a574d', secondaryContainer: '#f8ded7',
      background: '#fdf8f6', surface: '#ffffff', surfaceContainer: '#fceee9',
      surfaceContainerLow: '#fdf8f6', surfaceContainerLowest: '#ffffff', surfaceContainerHigh: '#f3e0d8',
      onBackground: '#231a17', onSurface: '#231a17', onSurfaceVariant: '#53433e',
      outlineVariant: '#e8d0ca',
      fontHeadline: "'Plus Jakarta Sans', sans-serif", fontBody: "'Plus Jakarta Sans', sans-serif", fontLabel: "'Plus Jakarta Sans', sans-serif",
    },
  },
  {
    id: 'natural',
    name: 'Natural',
    swatch: '#00a651',
    theme: {
      primary: '#00a651', onPrimary: '#ffffff', primaryContainer: '#2D6A4F',
      secondary: '#1B4332', secondaryContainer: '#1B4332',
      background: '#F8F9FA', surface: '#ffffff', surfaceContainer: '#f0f4f0',
      surfaceContainerLow: '#f8faf8', surfaceContainerLowest: '#ffffff', surfaceContainerHigh: '#e8ede8',
      onBackground: '#1A1A1A', onSurface: '#1A1A1A', onSurfaceVariant: '#444444',
      outlineVariant: '#d0d8d0',
      fontHeadline: "'Outfit', sans-serif", fontBody: "'Outfit', sans-serif", fontLabel: "'Outfit', sans-serif",
    },
  },
  {
    id: 'elegante',
    name: 'Elegante',
    swatch: '#d4af37',
    theme: {
      primary: '#f2ca50', onPrimary: '#3c2f00', primaryContainer: '#d4af37',
      secondary: '#ffb77d', secondaryContainer: '#fd8b00',
      background: '#131313', surface: '#131313', surfaceContainer: '#201f1f',
      surfaceContainerLow: '#1c1b1b', surfaceContainerLowest: '#0e0e0e', surfaceContainerHigh: '#2a2a2a',
      onBackground: '#e5e2e1', onSurface: '#e5e2e1', onSurfaceVariant: '#d0c5af',
      outlineVariant: '#4d4635',
      fontHeadline: "'Noto Serif', serif", fontBody: "'Manrope', sans-serif", fontLabel: "'Manrope', sans-serif",
    },
  },
  {
    id: 'rosa',
    name: 'Rosa',
    swatch: '#ff85a2',
    theme: {
      primary: '#ff85a2', onPrimary: '#ffffff', primaryContainer: '#2c1015',
      secondary: '#ffccd5', secondaryContainer: '#fff0f3',
      background: '#fff5f6', surface: '#ffffff', surfaceContainer: '#ffe5ec',
      surfaceContainerLow: '#fff5f6', surfaceContainerLowest: '#ffffff', surfaceContainerHigh: '#ffd3e8',
      onBackground: '#2c1015', onSurface: '#2c1015', onSurfaceVariant: '#7a5259',
      outlineVariant: '#ffccd5',
      fontHeadline: "'Outfit', sans-serif", fontBody: "'Outfit', sans-serif", fontLabel: "'Outfit', sans-serif",
    },
  },
  {
    id: 'clasico',
    name: 'Clásico',
    swatch: '#0058be',
    theme: {
      primary: '#0058be', onPrimary: '#ffffff', primaryContainer: '#2170e4',
      secondary: '#545f73', secondaryContainer: '#d5e0f8',
      background: '#f9f9ff', surface: '#ffffff', surfaceContainer: '#ecedf7',
      surfaceContainerLow: '#f2f3fd', surfaceContainerLowest: '#ffffff', surfaceContainerHigh: '#e6e7f2',
      onBackground: '#191b23', onSurface: '#191b23', onSurfaceVariant: '#424754',
      outlineVariant: '#c2c6d6',
      fontHeadline: "'Outfit', sans-serif", fontBody: "'Outfit', sans-serif", fontLabel: "'Outfit', sans-serif",
    },
  },
];

export function getColorPreset(id: string): ColorPreset | null {
  return COLOR_PRESETS.find((p) => p.id === id) ?? null;
}
