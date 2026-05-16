---
name: Warm Minimalism
colors:
  surface: '#fff8f6'
  surface-dim: '#e9d6d2'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff0ee'
  surface-container: '#fdeae6'
  surface-container-high: '#f8e4e0'
  surface-container-highest: '#f2deda'
  on-surface: '#231917'
  on-surface-variant: '#56423e'
  inverse-surface: '#392e2b'
  inverse-on-surface: '#ffede9'
  outline: '#89726d'
  outline-variant: '#ddc0ba'
  surface-tint: '#9f402d'
  primary: '#9f402d'
  on-primary: '#ffffff'
  primary-container: '#e2725b'
  on-primary-container: '#5a0d02'
  inverse-primary: '#ffb4a5'
  secondary: '#745853'
  on-secondary: '#ffffff'
  secondary-container: '#fed7d0'
  on-secondary-container: '#795c57'
  tertiary: '#006b5b'
  on-tertiary: '#ffffff'
  tertiary-container: '#00a58e'
  on-tertiary-container: '#00322a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad3'
  primary-fixed-dim: '#ffb4a5'
  on-primary-fixed: '#3e0500'
  on-primary-fixed-variant: '#802918'
  secondary-fixed: '#ffdad4'
  secondary-fixed-dim: '#e3beb8'
  on-secondary-fixed: '#2b1613'
  on-secondary-fixed-variant: '#5b403c'
  tertiary-fixed: '#7bf8dd'
  tertiary-fixed-dim: '#5cdbc2'
  on-tertiary-fixed: '#00201a'
  on-tertiary-fixed-variant: '#005144'
  background: '#fff8f6'
  on-background: '#231917'
  surface-variant: '#f2deda'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h1:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h2:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  h3:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  container-max: 1200px
  gutter: 16px
---

## Brand & Style

The design system is anchored in the concept of "Warm Minimalism." It avoids the clinical coldness often found in modern tech by utilizing an earth-toned palette and organic, rounded forms. The goal is to evoke a sense of artisanal quality, freshness, and culinary comfort. 

The aesthetic is sophisticated yet approachable, targeting urban food enthusiasts who value both convenience and aesthetic presentation. The UI prioritizes high-quality food photography by utilizing expansive "cream space," ensuring that the marketplace feels like a high-end boutique rather than a cluttered warehouse.

## Colors

The color palette is derived from natural, earthy elements. The primary Terracotta provides a vibrant, appetizing call-to-action color that stimulates interest without being aggressive. Chocolate Brown replaces traditional blacks or greys for typography and structural accents to maintain a soft, premium warmth.

The background uses a Soft Cream/Bone hue to reduce eye strain and provide a more "organic" feel than pure white. Pure White is reserved strictly for interactive cards and elevated surfaces to create clear visual separation through contrast rather than heavy lines.

## Typography

This design system utilizes **Plus Jakarta Sans** for all levels of the hierarchy. This typeface was chosen for its modern, geometric structure tempered by soft, rounded terminals that mirror the shape language of the UI.

- **Headlines:** Use tight tracking and bold weights to create a strong editorial presence.
- **Body Text:** Set in Chocolate Brown with generous line height to ensure maximum readability against the cream background.
- **Labels:** Utilize a slight increase in letter spacing and a semi-bold weight to distinguish metadata from body content.

## Layout & Spacing

The layout philosophy centers on a fluid, mobile-first grid system. For the PWA experience, the design system employs a 4-column grid on mobile and a 12-column grid on desktop, with content capped at 1200px.

A 8px base unit drives the spacing rhythm. To achieve "Warm Minimalism," the design system leans heavily into the **'lg' (40px)** and **'xl' (64px)** tokens for vertical section padding, ensuring the interface never feels crowded. Elements should be grouped with 'sm' spacing, while distinct sections are separated by 'lg' units to maintain a clear visual hierarchy.

## Elevation & Depth

Depth is conveyed through a combination of tonal layering and soft, ambient shadows. Because the background is cream-toned, shadows are not neutral grey; they are slightly tinted with Chocolate Brown (e.g., `#3E2723` at 8-12% opacity) to maintain warmth.

- **Level 0 (Background):** Soft Cream/Bone. Used for the main canvas.
- **Level 1 (Cards/Elements):** Pure White. These elements use a very soft, diffused shadow with a large blur radius (20px+) to appear as if they are floating gently above the background.
- **Level 2 (Interaction):** When a user interacts with a card or button, the shadow deepens slightly and the element may lift, increasing the blur.

The design system avoids harsh borders, relying on color contrast and subtle shadows to define boundaries.

## Shapes

The shape language is highly rounded and friendly, mimicking modern mobile OS patterns. 

- **Standard Elements:** Buttons, input fields, and small cards use a **0.5rem (8px)** corner radius.
- **Large Containers:** Product cards and featured banners use a **1rem (16px)** corner radius.
- **Special Accents:** Elements like category filters and chips use a **1.5rem (24px)** or fully pill-shaped radius to create visual variety and tactile appeal.

## Components

### Buttons
Primary buttons are solid Terracotta with white text, utilizing a high roundedness and substantial padding (e.g., 16px 32px). Secondary buttons use a Chocolate Brown outline or a transparent background with brown text for a more understated look.

### Cards
Cards are the primary vehicle for content. They must be Pure White with a Level 1 shadow and a 16px corner radius. Images within cards should be top-aligned and share the top corner radius of the card container.

### Input Fields
Inputs should have a Soft Cream background (slightly darker than the page background) to indicate interactivity. They feature a subtle 1px border in a lightened Chocolate Brown when focused.

### Chips & Filters
Chips are pill-shaped. Active chips use a light Terracotta tint with Terracotta text, while inactive chips remain transparent with a thin Chocolate Brown border.

### Minimalist Icons
Icons should be thin-stroke (2pt) and open-ended. Avoid filled icons unless they represent an active state (e.g., a filled heart for a "favorited" item). Icons are always rendered in Chocolate Brown.

### Navigation
For the PWA, a bottom navigation bar is recommended for mobile. It should be Pure White with a subtle top-border shadow, using minimalist icons and caption-level typography.