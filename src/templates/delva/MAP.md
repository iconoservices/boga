# 🗺️ Mapa del Proyecto DELVA

Este documento sirve como guía para entender la arquitectura y las decisiones de diseño tomadas en el Marketplace.

## 🏗️ Estructura de Archivos Clave
- `src/App.tsx`: Cerebro de la aplicación. Maneja las rutas, el estado global, la sincronización con Firebase y el sistema de temas dinámicos.
- `src/views/HomeView.tsx`: Pantalla principal tipo "Feed" social.
- `src/views/ProductDetailView.tsx`: (ÚLTIMO REFACTOR) Vista de producto optimizada para móviles con branding de vendedor.
- `src/index.css`: Sistema de diseño basado en variables CSS (Tokens). Aquí vive la magia de la responsividad.

## 🎨 Lógica de Temas (Dynamic Theming)
El proyecto utiliza **Inyección de CSS Variables**. 
1. Los colores se leen desde el perfil del usuario en Firebase (`seller.customPrimary`).
2. Se inyectan en el componente mediante estilos en línea: `style={{ '--theme-accent': themeColor }}`.
3. El CSS usa `var(--theme-accent)` para que los botones y detalles cambien automáticamente.

## 📱 Filosofía "Native Feel"
Buscamos que la web no se sienta como una web, sino como una app instalada.
- **Header Stickies**: Las cabeceras siempre están presentes.
- **Formatos 4:5**: Imágenes tipo Instagram para mejor scroll.
- **Zonas de Pulgar**: Botones grandes en la parte inferior para fácil acceso con una mano.

---
*Nota: Este mapa se actualiza conforme el proyecto evoluciona.*
