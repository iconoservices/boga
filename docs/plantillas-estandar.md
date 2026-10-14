# Mapa y estándar de plantillas de tienda

Cómo se construye una plantilla de Boga y qué debería tener TODA plantilla con catálogo. Hecho el 14 oct 2026 a partir de una revisión del código (por búsqueda de texto: puede fallar en algún caso, revisar la plantilla antes de darla por mala).

## 1. Cómo se arma una plantilla

```
StoreRenderer.tsx  →  elige la plantilla por store.template (case 'delva': …)
   └─ <XTemplate store initialProductId initialTab />
        ├─ useCatalogo(store, initialProductId)   productos, categorías, carrito, WhatsApp, ofertas, medidas…
        ├─ useTabRuta(store.slug, 'home', initialTab)   pestaña activa ↔ dirección (/<tienda>/<pestaña>)
        ├─ tarjeta de producto   (compartida: ProductGrid/FotoTarjeta, o propia como la de Delva)
        ├─ ProductModal · CartPanel · ContactPanel · AddedToast   (shared/CatalogoUI + AddFeedback)
        └─ StoreFloatingActions (compartir · instalar · campana)  +  CustomerAccountButton (cuenta del cliente)
```

Para sumar una plantilla hay que registrarla en: `lib/templates.config.ts` (tema + demo), `StoreRenderer.tsx`, `lib/rutasTienda.ts`, `lib/presentaciones.ts` (si acepta medidas), `lib/productos.ts` (paquete) y las páginas del superadmin (`mapa`, `page` META/PORTAL, `plantillas`).

## 2. Estándar: lo que toda plantilla con catálogo debería tener

| # | Pieza | Dónde vive |
|---|-------|-----------|
| 1 | Motor de catálogo (productos reales de la base, demo si está vacía) | `shared/useCatalogo.ts` |
| 2 | Pestañas con dirección propia | `shared/useTabRuta.ts` + `lib/rutasTienda.ts` |
| 3 | Ficha del producto (varias fotos, medidas, otras monedas, IGV) | `ProductModal` |
| 4 | Carrito y pedido por WhatsApp | `CartPanel` + `lib/whatsapp.ts` |
| 5 | Aviso "Agregado" y numerito que rebota | `AddedToast` / `CartBadge` |
| 6 | Favoritos (corazón) | `BotonFavorito` |
| 7 | Compartir / instalar app / campana | `StoreFloatingActions` |
| 8 | Botón de cuenta del cliente en el encabezado | `CustomerAccountButton variant="encabezado"` |
| 9 | Precio en otras monedas, IGV, "consultar precio" y servicios | `OtrosPrecios`, `IgvTag`, `soloConsulta` |
| 10 | **Fotos que cambian solas cuando el producto trae varias** (mouse encima en computadora; a la vista en celular) | `shared/useCicloFotos.ts` |

**Regla:** una pieza nueva que le sirva a todas se escribe UNA vez en `templates/shared/` y las plantillas la usan; no se copia en cada una (así se desincronizaban).

## 3. Estado por plantilla

El cuadro vivo (y visual) está en **/superadmin/mapa** ("Estándar de construcción"), alimentado por `src/lib/estandarPlantillas.ts`. Ese archivo se mantiene a mano: al sumar una pieza a una plantilla, anotarla ahí. Las rutas salen solas de `lib/rutasTienda.ts`.

Resumen (14 oct 2026):
- **Motor compartido:** Bazar, Belleza, Detalles, Ficha digital, Ficha plana, Flores, Inicio catálogo, Menú directo, Pollería, Tecnología, Veterinaria, Delva, Gas, Helados, Rack, Uniformes, Mercado, Empresa, Academia, Terrenos (los dos). **Con diseño y lógica propios (sin motor):** Atelier, Lookbook, Mirka Visual, Estilos Mirka, Natura, Amazonia, Sunset, Sweet Kitty Nails, Discoteca, Cartelera.
- **Fotos que cambian solas:** todas las plantillas con tarjeta de producto.
- **Rutas por pestaña:** falta Helados, Rack, Uniformes, Mercado y las propias.
- **Favoritos:** faltan Mercado, Empresa, Academia, Mirka Visual, Estilos Mirka, Natura, Amazonia, Sunset, Sweet Kitty Nails, Discoteca, Cartelera y Terrenos.
- **Cuenta del cliente en el encabezado:** faltan las propias sin botón (Mirka Visual, Estilos Mirka, Natura, Amazonia, Sunset, Sweet Kitty Nails, Cartelera, Terrenos).

## 4. Cómo se hizo el cambio de fotos (para repetirlo en otras piezas)

- `shared/useCicloFotos.ts`: la lógica (mouse en PC; en celular, rota mientras la tarjeta se ve; respeta "reducir animaciones").
- `shared/FotoCiclica.tsx`: reemplaza al `<img>` de una tarjeta; recibe `fotos` (lista) y el mismo `className` que tenía la imagen.
- La tarjeta compartida (`FotoTarjeta` en CatalogoUI) y la de Delva usan el hook; las demás usan `FotoCiclica`.
- Requisito: la plantilla debe traer `images` desde la base (useCatalogo ya lo hace; las propias lo mapean).

## 5. Pendientes

- Favoritos, cuenta del cliente y rutas por pestaña en las plantillas que faltan (ver arriba).
- Pasar las plantillas propias al motor compartido para que cualquier pieza nueva les llegue sola.
- **Varios banners** (el dueño suma banners en /admin → «Más banners», columna `stores.hero_images`, `StoreConfig.heroImages`): hoy los muestran Delva, Mercado y Tecnología (las que tienen carrusel). Falta el resto: las demás usan solo `heroImage`.
