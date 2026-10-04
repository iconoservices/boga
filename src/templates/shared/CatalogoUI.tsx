'use client';

import React, { useEffect } from 'react';
import { guardarCliente, leerCliente, normalizarCelular } from '@/lib/cliente';
import type { StoreTheme } from '@/lib/templates.config';
import { ahorroPorCantidad, type Presentacion } from '@/lib/presentaciones';
import { TXT, ICON, soles, type Producto, type Categoria } from './tokens';
import { AddButton, CartBadge, EVENTO_VER_PEDIDO } from './AddFeedback';

/* ════════════════════════════════════════════
   CHIPS DE CATEGORIA
   ════════════════════════════════════════════ */

export function CategoryChips({
  t, tabs, active, onSelect, sticky = 'top-16 md:top-[60px]',
}: {
  t: StoreTheme;
  tabs: Categoria[];
  active: string;
  onSelect: (id: string) => void;
  sticky?: string;
}) {
  return (
    <nav
      className={`hide-scrollbar px-5 md:px-6 overflow-x-auto flex gap-3 whitespace-nowrap sticky ${sticky} py-3 z-40`}
      style={{ background: `${t.background}F0`, backdropFilter: 'blur(12px)' }}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full shrink-0 ${TXT.small} font-bold transition-all active:scale-95 shadow-sm border`}
            style={{
              background: isActive ? t.primary : t.surface,
              color: isActive ? t.onPrimary : t.onSurfaceVariant,
              borderColor: isActive ? 'transparent' : `${t.outlineVariant}60`,
              boxShadow: isActive ? `0 4px 12px ${t.primary}40` : 'none',
            }}
          >
            {tab.icon && (
              <span
                className={`material-symbols-outlined ${ICON.sm}`}
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {tab.icon}
              </span>
            )}
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

/** Foto de una tarjeta del catálogo: con varias fotos, al pasar el mouse va rotando entre ellas (como Delva). */
function FotoTarjeta({ product }: { product: Producto }) {
  const fotos = product.images && product.images.length > 1 ? product.images : [product.image];
  const [activa, setActiva] = React.useState<number | null>(null);

  useEffect(() => {
    if (activa === null || fotos.length < 2) return;
    const id = setTimeout(() => setActiva((activa + 1) % fotos.length), 900);
    return () => clearTimeout(id);
  }, [activa, fotos.length]);

  return (
    <div
      className="aspect-square overflow-hidden relative"
      onMouseEnter={() => fotos.length > 1 && setActiva(0)}
      onMouseLeave={() => setActiva(null)}
    >
      {fotos.map((src, i) => (
        <img
          key={i}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-[opacity,transform] duration-500"
          style={{ opacity: (activa ?? 0) === i ? 1 : 0 }}
          alt={product.name}
          src={src}
          loading="lazy"
        />
      ))}
      {fotos.length > 1 && (
        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex gap-1">
          {fotos.map((_, i) => (
            <div
              key={i}
              className="h-[3px] flex-1 rounded-full transition-colors"
              style={{ background: (activa ?? 0) === i ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.4)' }}
            />
          ))}
        </div>
      )}
      {product.esCombo && (
        <div className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-md z-10 flex items-center gap-0.5">
          <span>🔥</span> COMBO
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   GRILLA DE PRODUCTOS
   ════════════════════════════════════════════ */

export function ProductGrid({
  t, productos, onSelect, onAdd, onVerTodo, catalogo,
}: {
  t: StoreTheme;
  productos: Producto[];
  onSelect: (p: Producto) => void;
  onAdd: (p: Producto) => void;
  onVerTodo?: () => void;
  /** Tienda de catálogo (no de comida): cambia los textos de "platos" y "menú". */
  catalogo?: boolean;
}) {
  // Antes una categoria sin productos dejaba la pantalla en blanco.
  if (productos.length === 0) {
    return (
      <div className="py-16 text-center">
        <span className={`material-symbols-outlined ${ICON.xl} mb-3 block`} style={{ color: `${t.onSurfaceVariant}80` }}>
          restaurant_menu
        </span>
        <p className={`font-bold ${TXT.body}`} style={{ color: t.onSurface }}>
          {catalogo ? 'Todavía no hay productos en esta categoría' : 'Todavía no hay platos en esta categoría'}
        </p>
        {onVerTodo && (
          <button
            onClick={onVerTodo}
            className={`mt-4 px-6 py-2.5 rounded-full font-bold ${TXT.small} uppercase active:scale-95 transition-all`}
            style={{ background: t.primary, color: t.onPrimary }}
          >
            {catalogo ? 'Ver todo el catálogo' : 'Ver todo el menú'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
      {productos.map((product) => (
        <div
          key={product.id}
          onClick={() => onSelect(product)}
          className="rounded-2xl overflow-hidden group relative cursor-pointer border hover:shadow-lg transition-all duration-300 flex flex-col"
          style={{ background: t.surface, borderColor: `${t.outlineVariant}30` }}
        >
          <FotoTarjeta product={product} />
          <div className="p-2.5 flex flex-col flex-1">
            <h4 className={`font-bold ${TXT.body} leading-tight mb-1 line-clamp-2`} style={{ color: t.onSurface }}>
              {product.name}
            </h4>
            <p className={`${TXT.micro} mb-2 line-clamp-2 flex-1`} style={{ color: t.onSurfaceVariant }}>
              {product.presentaciones?.length ? product.presentaciones.map((x) => x.label).join(' · ') : product.desc}
            </p>
            {product.presentaciones?.some((x) => x.promo) && (
              <span className="mb-1.5 w-fit text-[10px] font-black px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-white">🔥 Promos por cantidad</span>
            )}
            <div className="flex justify-between items-center mt-auto">
              <span className={`font-extrabold ${TXT.lead}`} style={{ color: t.primary }}>
                {product.presentaciones?.length ? <span className={`block ${TXT.micro} font-semibold`} style={{ color: t.onSurfaceVariant }}>Desde</span> : null}
                {soles(product.price)}
                {product.priceAnterior && (
                  <span className={`block ${TXT.micro} font-medium line-through`} style={{ color: t.onSurfaceVariant }}>{soles(product.priceAnterior)}</span>
                )}
              </span>
              {/* Un servicio no se "agrega": se consulta desde su ficha (el tap en la tarjeta ya la abre). */}
              {!product.esServicio && (
                // Con medidas, el "+" agrega la más chica (la del precio "Desde"); para otra medida se toca el producto.
                <AddButton t={t} nombre={product.name} onAdd={() => onAdd(product)} />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════
   CARRUSEL DE COMBOS Y OFERTAS (Primera fila destacada)
   ════════════════════════════════════════════ */

export function CombosCarrusel({
  t,
  productos,
  onSelect,
  onAdd,
  onVerMas,
  titulo,
  icono = '🔥',
}: {
  t: StoreTheme;
  productos: Producto[];
  onSelect: (p: Producto) => void;
  onAdd: (p: Producto) => void;
  onVerMas?: () => void;
  titulo?: string;
  /** Emoji delante del título (por defecto 🔥, para combos y ofertas). Vacío = sin emoji, para filas de categoría. */
  icono?: string;
}) {
  if (!productos || productos.length === 0) return null;

  const tieneCombos = productos.some((p) => p.esCombo);
  const tieneOfertas = productos.some((p) => Boolean(p.priceAnterior) && p.priceAnterior! > p.price);
  const encabezado = titulo || (tieneCombos && tieneOfertas
    ? 'Combos & Ofertas'
    : tieneCombos
      ? 'Combos de la Casa'
      : 'Ofertas del Día');

  return (
    <section className="mb-6 animate-fade-in">
      <div className="px-5 md:px-6 flex items-center justify-between gap-3 mb-3">
        <h3 className={`${TXT.lead} font-black uppercase italic tracking-tight flex items-center gap-1.5`} style={{ color: t.onSurface }}>
          {icono && <span className="text-amber-500">{icono}</span>} {encabezado}
        </h3>
        {onVerMas && (
          <button
            onClick={onVerMas}
            className={`${TXT.small} font-bold flex items-center gap-0.5 hover:underline active:scale-95 transition-transform`}
            style={{ color: t.primary }}
          >
            Ver todos <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        )}
      </div>

      <div
        className="flex gap-3 overflow-x-auto hide-scrollbar px-5 md:px-6 pb-2 snap-x"
        style={{ scrollbarWidth: 'none' }}
      >
        {productos.map((product) => {
          const pct = product.priceAnterior && product.priceAnterior > product.price
            ? `-${Math.round((1 - product.price / product.priceAnterior) * 100)}%`
            : null;

          return (
            <div
              key={product.id}
              onClick={() => onSelect(product)}
              className="w-[170px] sm:w-[195px] shrink-0 snap-start rounded-2xl overflow-hidden group relative cursor-pointer border shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
              style={{ background: t.surface, borderColor: `${t.outlineVariant}40` }}
            >
              <div className="aspect-[4/3] overflow-hidden relative bg-black/5">
                <img
                  src={product.images?.[0] || product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
                  {product.esCombo && (
                    <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm flex items-center gap-0.5">
                      <span>🔥</span> COMBO
                    </span>
                  )}
                  {pct && (
                    <span className="bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm" style={{ background: t.primary }}>
                      {pct}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 flex flex-col flex-1">
                <h4 className={`font-bold ${TXT.body} leading-tight mb-1 line-clamp-2`} style={{ color: t.onSurface }}>
                  {product.name}
                </h4>
                <p className={`${TXT.micro} mb-2 line-clamp-2 flex-1`} style={{ color: t.onSurfaceVariant }}>
                  {product.desc || (product.presentaciones?.length ? product.presentaciones.map((x) => x.label).join(' · ') : '')}
                </p>
                <div className="flex justify-between items-center mt-auto pt-1 border-t" style={{ borderColor: `${t.outlineVariant}25` }}>
                  <div className="flex flex-col">
                    <span className={`font-extrabold ${TXT.lead}`} style={{ color: t.primary }}>
                      {soles(product.price)}
                    </span>
                    {product.priceAnterior && product.priceAnterior > product.price && (
                      <span className={`${TXT.micro} font-medium line-through`} style={{ color: t.onSurfaceVariant }}>
                        {soles(product.priceAnterior)}
                      </span>
                    )}
                  </div>
                  {!product.esServicio && (
                    <AddButton t={t} nombre={product.name} onAdd={() => onAdd(product)} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════
   MODAL DE PRODUCTO
   ════════════════════════════════════════════ */

export function ProductModal({
  t, producto, productos = [], onClose, onAdd, onSelect, onConsultar,
}: {
  t: StoreTheme;
  producto: Producto | null;
  /** Catalogo completo de la tienda: de aca salen los "Tambien te puede interesar". */
  productos?: Producto[];
  onClose: () => void;
  onAdd: (p: Producto, pres?: Presentacion, cantidad?: number) => void;
  /** Para poder tocar un sugerido y que el modal cambie al producto elegido. */
  onSelect?: (p: Producto) => void;
  /** Un servicio no se agrega al carrito: este botón manda directo a WhatsApp. */
  onConsultar?: (p: Producto) => void;
}) {
  const ahorros = React.useMemo(() => ahorroPorCantidad(producto?.presentaciones ?? []), [producto]);
  const [agregado, setAgregado] = React.useState(false);
  // Cuántas unidades se agregan de una vez (como en cualquier tienda: − 1 +).
  const [cantidad, setCantidad] = React.useState(1);
  // Medida elegida cuando el producto tiene presentaciones (por defecto la primera, la más chica).
  const [medida, setMedida] = React.useState<Presentacion | null>(null);
  // Foto que se ve arriba, cuando el producto tiene más de una.
  const [fotoActiva, setFotoActiva] = React.useState(0);
  const swipeFoto = React.useRef<number | null>(null);
  const cierre = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const contenedor = React.useRef<HTMLDivElement>(null);

  // Al cambiar de producto (por ejemplo tocando un sugerido) se limpia el boton y
  // se vuelve arriba: el modal conserva el scroll y si no, el nuevo producto
  // aparecia con la pantalla ya en la zona de sugeridos.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAgregado(false);
    setCantidad(1);
    setMedida(producto?.presentaciones?.[0] ?? null);
    setFotoActiva(0);
    contenedor.current?.scrollTo({ top: 0 });
    return () => { if (cierre.current) clearTimeout(cierre.current); };
  }, [producto]);

  // "Ver" del aviso "Agregado": el modal tapa la pantalla, asi que se cierra
  // para que el cliente vea el pedido.
  useEffect(() => {
    if (!producto) return;
    window.addEventListener(EVENTO_VER_PEDIDO, onClose);
    return () => window.removeEventListener(EVENTO_VER_PEDIDO, onClose);
  }, [producto, onClose]);

  // Bloquea el scroll del fondo y cierra con Escape.
  useEffect(() => {
    if (!producto) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previo;
      window.removeEventListener('keydown', onKey);
    };
  }, [producto, onClose]);

  const sugeridos = producto
    ? productos.filter((p) => p.id !== producto.id && p.category === producto.category).slice(0, 6)
    : [];

  if (!producto) return null;

  const fotos = producto.images && producto.images.length > 1 ? producto.images : [producto.image];

  return (
    <div
      ref={contenedor}
      className="fixed inset-0 z-[100] overflow-y-auto"
      style={{ background: t.surface }}
      role="dialog"
      aria-modal="true"
      aria-label={producto.name}
    >
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-20 w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
        style={{ background: 'rgba(0,0,0,0.45)', color: '#fff' }}
        aria-label="Cerrar"
      >
        <span className={`material-symbols-outlined ${ICON.md}`}>close</span>
      </button>

      {/* Galería: la foto se ve ENTERA (contain, con la misma foto desenfocada de fondo), se puede deslizar a los lados y
          las miniaturas van DEBAJO (antes tapaban la foto y la recortaban). */}
      <div className="w-full">
        <div
          className="w-full aspect-square md:aspect-auto md:h-[420px] relative overflow-hidden touch-pan-y"
          style={{ background: t.surfaceContainerLow }}
          onTouchStart={(e) => { swipeFoto.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (swipeFoto.current === null || fotos.length < 2) return;
            const dx = e.changedTouches[0].clientX - swipeFoto.current;
            swipeFoto.current = null;
            if (Math.abs(dx) > 40) setFotoActiva((i) => (dx < 0 ? (i + 1) % fotos.length : (i - 1 + fotos.length) % fotos.length));
          }}
        >
          <img aria-hidden alt="" src={fotos[fotoActiva] ?? producto.image} className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60" />
          <img className="relative w-full h-full object-contain" alt={producto.name} src={fotos[fotoActiva] ?? producto.image} />
          {fotos.length > 1 && (
            <span className="absolute bottom-2 right-3 text-[11px] font-bold px-2 py-0.5 rounded-full bg-black/55 text-white">
              {fotoActiva + 1} / {fotos.length}
            </span>
          )}
        </div>
        {fotos.length > 1 && (
          <div className="flex justify-center gap-2 px-4 pt-3 overflow-x-auto hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
            {fotos.map((foto, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setFotoActiva(i)}
                aria-label={`Ver foto ${i + 1} de ${producto.name}`}
                aria-current={fotoActiva === i}
                className="w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all active:scale-95"
                style={{ borderColor: fotoActiva === i ? t.primary : `${t.outlineVariant}`, opacity: fotoActiva === i ? 1 : 0.75, background: t.surfaceContainerLow }}
              >
                <img src={foto} className="w-full h-full object-contain" alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-5 pb-28">
        {producto.esCombo && (
          <div className="mb-2">
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-black px-2.5 py-1 rounded-lg shadow-sm inline-flex items-center gap-1">
              <span>🔥</span> COMBO / PACK
            </span>
          </div>
        )}
        <h2 className={`font-bold ${TXT.title}`} style={{ color: t.onSurface }}>{producto.name}</h2>
        {producto.desc && (
          <p className={`${TXT.body} mt-2 leading-relaxed`} style={{ color: t.onSurfaceVariant }}>{producto.desc}</p>
        )}

        {/* Presentaciones: el cliente elige la cantidad (100 g, 250 g, 1 kg…) y el precio cambia. */}
        {producto.presentaciones && producto.presentaciones.length > 0 && (
          <div className="mt-6">
            <h3 className={`font-bold ${TXT.body} mb-2`} style={{ color: t.onSurface }}>Elige la cantidad</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {producto.presentaciones.map((x) => {
                const activa = medida?.label === x.label;
                const ahorro = ahorros[x.label];
                return (
                  <button
                    key={x.label}
                    type="button"
                    onClick={() => setMedida(x)}
                    aria-pressed={activa}
                    className="rounded-xl px-3 py-2.5 text-left border-2 transition-colors active:scale-[0.98]"
                    style={{ borderColor: activa ? t.primary : `${t.outlineVariant}80`, background: activa ? `${t.primary}14` : t.surface, color: t.onSurface }}
                  >
                    <span className={`flex items-center justify-between gap-1 font-extrabold ${TXT.body}`}>
                      {x.label}
                      {x.promo && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-white shrink-0">🔥 PROMO</span>}
                    </span>
                    <span className={`block font-bold ${TXT.body}`} style={{ color: t.primary }}>{soles(x.price)}</span>
                    {ahorro && (
                      <span className="block text-[10px] font-bold leading-tight mt-0.5 text-green-700">
                        Ahorras {soles(ahorro.ahorro)} · {soles(ahorro.porUnidad)} c/u
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {sugeridos.length > 0 && (
          <div className="mt-10">
            <h3 className={`font-black uppercase italic tracking-tight mb-4 ${TXT.title}`} style={{ color: t.onBackground }}>
              También te puede interesar
            </h3>
            <ProductGrid t={t} productos={sugeridos} onSelect={(p) => onSelect?.(p)} onAdd={onAdd} />
          </div>
        )}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 p-4 flex justify-center"
        style={{ background: `${t.surface}F5`, backdropFilter: 'blur(12px)', borderTop: `1px solid ${t.outlineVariant}40` }}
      >
        <div className="w-full max-w-2xl flex items-center justify-between gap-2 sm:gap-4 px-1">
          <span className="font-black text-lg sm:text-xl shrink-0" style={{ color: t.primary }}>
            {soles((medida?.price ?? producto.price) * (producto.esServicio ? 1 : cantidad))}
            {!medida && cantidad === 1 && producto.priceAnterior && (
              <span className="ml-2 text-sm font-medium line-through" style={{ color: t.onSurfaceVariant }}>{soles(producto.priceAnterior)}</span>
            )}
          </span>
          {!producto.esServicio && (
            <div className="flex items-center gap-1 shrink-0 rounded-full border p-0.5" style={{ borderColor: `${t.outlineVariant}`, background: t.surface }}>
              <button
                type="button"
                aria-label="Menos"
                disabled={cantidad <= 1}
                onClick={() => setCantidad((n) => Math.max(1, n - 1))}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30"
                style={{ background: `${t.primary}15`, color: t.primary }}
              >
                <span className={`material-symbols-outlined ${ICON.sm}`}>remove</span>
              </button>
              <span className="min-w-[1.5rem] text-center font-black text-sm tabular-nums" style={{ color: t.onSurface }}>{cantidad}</span>
              <button
                type="button"
                aria-label="Más"
                onClick={() => setCantidad((n) => Math.min(99, n + 1))}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ background: t.primary, color: t.onPrimary }}
              >
                <span className={`material-symbols-outlined ${ICON.sm}`}>add</span>
              </button>
            </div>
          )}
          {producto.esServicio ? (
            <button
              onClick={() => onConsultar?.(producto)}
              className={`px-6 py-2.5 rounded-full font-bold ${TXT.body} flex items-center gap-1.5 active:scale-95 bg-[#25D366] text-white`}
            >
              <span className={`material-symbols-outlined ${ICON.sm}`}>chat</span>
              Consultar por WhatsApp
            </button>
          ) : (
            <button
              onClick={() => {
                // El modal se queda abierto: abajo hay sugeridos y el cliente
                // puede seguir agregando o mirando mas platos sin salir de aca.
                onAdd(producto, medida ?? undefined, cantidad);
                setAgregado(true);
                if (cierre.current) clearTimeout(cierre.current);
                cierre.current = setTimeout(() => setAgregado(false), 1200);
              }}
              className={`px-3 sm:px-6 py-2.5 rounded-full font-bold ${TXT.body} flex items-center gap-1 sm:gap-1.5 shrink-0 transition-[background-color,transform] active:scale-95 ${agregado ? 'add-btn-pop' : ''}`}
              style={{ background: agregado ? '#16a34a' : t.primary, color: agregado ? '#fff' : t.onPrimary }}
            >
              <span className={`material-symbols-outlined ${ICON.sm}`}>{agregado ? 'check' : 'add'}</span>
              {agregado ? 'Agregado' : 'Agregar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   PESTAÑA: PEDIDOS
   ════════════════════════════════════════════ */

export function CartPanel({
  t, cartItems, subtotal, onAdd, onRemove, onVaciar, onConfirmar, onIrAlMenu, whatsappVisible, pagoOnline, onPagarOnline, catalogo, entregaDisponible = 'ambos',
}: {
  t: StoreTheme;
  /** `clave`, `pres` y `precio` los pone useCatalogo (ver lib/presentaciones.ts); sin ellos la línea es el producto a su precio. */
  cartItems: { producto: Producto; qty: number; clave?: string; pres?: Presentacion; precio?: number }[];
  subtotal: number;
  onAdd: (p: Producto, pres?: Presentacion) => void;
  onRemove: (id: string) => void;
  onVaciar: () => void;
  onConfirmar: (datos: { nombre: string; telefono: string; entrega: 'delivery' | 'recojo'; direccion: string }) => void;
  onIrAlMenu: () => void;
  whatsappVisible: boolean;
  /** Tienda de catálogo (no de comida): cambia los textos de "menú" y "platos". */
  catalogo?: boolean;
  /** La tienda cobra con tarjeta / Yape (Izipay): se ofrece pagar online además de confirmar por WhatsApp. */
  pagoOnline?: boolean;
  onPagarOnline?: (datos: { nombre: string; telefono: string; entrega: 'delivery' | 'recojo'; direccion: string }) => Promise<void> | void;
  /** Cómo entrega la tienda: 'ambos' deja elegir (de siempre); 'delivery'/'recojo' fuerza esa sola opción y esconde el selector. */
  entregaDisponible?: 'delivery' | 'recojo' | 'ambos';
}) {
  const [pagando, setPagando] = React.useState(false);
  // «Usar mi ubicación»: en Pucallpa muchas direcciones son «jirón tal, frente al colegio»; con el punto del GPS el repartidor llega.
  // Se agrega a la dirección un enlace de Google Maps (la tienda lo abre con un toque). Solo se envía a la tienda, al confirmar.
  const [ubicando, setUbicando] = React.useState(false);
  const [ubicMsg, setUbicMsg] = React.useState('');
  // Antes el pedido se mandaba por WhatsApp con solo los items y el total: el
  // dueño tenia que volver a preguntar quien pedia y si era delivery o recojo.
  // Pedirlo aca hace que el primer mensaje ya venga completo.
  const [nombre, setNombre] = React.useState('');
  const [entrega, setEntrega] = React.useState<'delivery' | 'recojo'>(entregaDisponible === 'recojo' ? 'recojo' : 'delivery');
  const [direccion, setDireccion] = React.useState('');
  const [celular, setCelular] = React.useState('');

  // Si ya pidió antes, se le rellenan el nombre y el celular (se leen recién en el navegador, no en el servidor).
  React.useEffect(() => {
    const previo = leerCliente();
    if (previo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNombre((n) => n || previo.nombre);
      setCelular((c) => c || previo.telefono);
    }
  }, []);

  const telefono = normalizarCelular(celular);
  const usarUbicacion = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setUbicMsg('Tu navegador no permite ubicarte. Escribe tu dirección.'); return; }
    setUbicando(true);
    setUbicMsg('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const enlace = `https://maps.google.com/?q=${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`;
        // Si ya había una ubicación agregada antes, se reemplaza (no se acumulan enlaces).
        setDireccion((d) => {
          const base = d.replace(/\s*·?\s*📍\s*https:\/\/maps\.google\.com\/\?q=\S+/g, '').trim();
          return (base ? `${base} · ` : '') + `📍 ${enlace}`;
        });
        setUbicMsg(`Ubicación agregada (precisión aproximada: ${Math.round(pos.coords.accuracy)} m). Suma una referencia: color de la casa, frente a qué queda.`);
        setUbicando(false);
      },
      (err) => {
        setUbicMsg(err.code === 1 ? 'No diste permiso de ubicación. Actívalo en tu navegador o escribe tu dirección.' : 'No pudimos obtener tu ubicación. Escribe tu dirección.');
        setUbicando(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  const faltaCelular = !telefono;
  const faltaNombre = !nombre.trim();
  const faltaDireccion = entrega === 'delivery' && !direccion.trim();
  const [celularTocado, setCelularTocado] = React.useState(false);
  // El error solo sale si ya escribió algo (o salió del campo): no se le grita a quien recién llega.
  const celularInvalido = faltaCelular && (celularTocado || celular.trim().length >= 9);
  const faltantes = [
    faltaNombre && 'tu nombre',
    faltaCelular && 'un celular válido',
    faltaDireccion && 'la dirección de entrega',
  ].filter(Boolean) as string[];

  return (
    <div className={`animate-fade-in px-5 ${cartItems.length === 0 ? 'py-8' : 'py-5'} max-w-[600px] mx-auto text-center space-y-6`}>
      {/* El círculo grande solo acompaña al carrito vacío: con productos ocupaba el primer pantallazo sin aportar nada. */}
      {cartItems.length === 0 && (
        <div
          className="w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-inner"
          style={{ backgroundColor: `${t.primary}15` }}
        >
          <span className={`material-symbols-outlined ${ICON.xl}`} style={{ color: t.primary }}>
            shopping_cart_checkout
          </span>
        </div>
      )}

      {cartItems.length === 0 ? (
        <div className="space-y-4">
          <h3 className={`font-bold ${TXT.title}`}>Tu carrito está vacío</h3>
          <p className={`${TXT.body} max-w-xs mx-auto`} style={{ color: t.onSurfaceVariant }}>
            {catalogo ? 'Explora nuestro catálogo y agrega tus productos favoritos.' : 'Explora nuestro delicioso menú y agrega tus combos o platos favoritos.'}
          </p>
          <button
            onClick={onIrAlMenu}
            className={`px-8 py-3 rounded-full font-bold ${TXT.body} shadow-md uppercase inline-block active:scale-95 transition-all`}
            style={{ backgroundColor: t.primary, color: t.onPrimary }}
          >
            {catalogo ? 'Ir al catálogo' : 'Ir al Menú'}
          </button>
        </div>
      ) : (
        <div
          className="space-y-5 text-left p-6 rounded-3xl border shadow-sm"
          style={{ background: t.surface, borderColor: `${t.outlineVariant}40` }}
        >
          <h3
            className="font-black text-xl uppercase italic border-b pb-3"
            style={{ color: t.primary, borderColor: `${t.outlineVariant}60` }}
          >
            Resumen de tu Pedido
          </h3>

          <div className="space-y-3">
            {cartItems.map((l) => (
              <div
                key={l.clave ?? l.producto.id}
                className="flex items-center gap-3 pb-3 border-b"
                style={{ borderColor: `${t.outlineVariant}40` }}
              >
                <img src={l.producto.image} alt={l.producto.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className={`font-bold ${TXT.body} leading-tight line-clamp-2`} style={{ color: t.onSurface }}>
                    {l.producto.esCombo && (
                      <span className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded mr-1.5 align-middle shadow-xs">
                        COMBO
                      </span>
                    )}
                    {l.producto.name}{l.pres ? ` · ${l.pres.label}` : ''}
                  </p>
                  <p className={TXT.micro} style={{ color: t.onSurfaceVariant }}>{soles(l.precio ?? l.producto.price)} c/u</p>
                </div>
                {/* Total y controles apilados: en una sola fila el nombre quedaba en "Pa..." a 375px */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`font-black ${TXT.body}`} style={{ color: t.primary }}>
                    {soles((l.precio ?? l.producto.price) * l.qty)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onRemove(l.clave ?? l.producto.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-all"
                      style={{ background: `${t.primary}15`, color: t.primary }}
                      aria-label={`Quitar uno de ${l.producto.name}`}
                    >
                      <span className={`material-symbols-outlined ${ICON.sm}`}>remove</span>
                    </button>
                    <span className={`font-black ${TXT.body} w-5 text-center`} style={{ color: t.onSurface }}>{l.qty}</span>
                    <button
                      onClick={() => onAdd(l.producto, l.pres)}
                      className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-all"
                      style={{ background: t.primary, color: t.onPrimary }}
                      aria-label={`Agregar otro ${l.producto.name}`}
                    >
                      <span className={`material-symbols-outlined ${ICON.sm}`}>add</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl flex justify-between items-center" style={{ background: t.surfaceContainer }}>
            <span className={`font-bold ${TXT.small} uppercase`} style={{ color: t.onSurfaceVariant }}>Total</span>
            <span className={`font-black ${TXT.title}`} style={{ color: t.primary }}>{soles(subtotal)}</span>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <label htmlFor="carrito-nombre" className={`block ${TXT.micro} font-bold uppercase mb-1`} style={{ color: t.onSurfaceVariant }}>
                Tu nombre
              </label>
              <input
                id="carrito-nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="¿A nombre de quién va el pedido?"
                className={`w-full border rounded-xl px-3 py-2.5 ${TXT.small} font-semibold focus:outline-none`}
                style={{ borderColor: `${t.outlineVariant}80`, background: t.surface, color: t.onSurface }}
              />
            </div>

            <div>
              <label htmlFor="carrito-celular" className={`block ${TXT.micro} font-bold uppercase mb-1`} style={{ color: t.onSurfaceVariant }}>
                Tu celular
              </label>
              <input
                id="carrito-celular"
                type="tel"
                inputMode="numeric"
                value={celular}
                onChange={(e) => setCelular(e.target.value)}
                onBlur={() => setCelularTocado(true)}
                aria-invalid={celularInvalido}
                aria-describedby="carrito-celular-ayuda"
                placeholder="9XX XXX XXX"
                className={`w-full border rounded-xl px-3 py-2.5 ${TXT.small} font-semibold focus:outline-none`}
                style={{ borderColor: celularInvalido ? '#dc2626' : `${t.outlineVariant}80`, background: t.surface, color: t.onSurface }}
              />
              {/* Antes el boton quedaba apagado sin decir por que: quien ponia un
                  numero que no era un celular no sabia que era eso lo que fallaba. */}
              <p
                id="carrito-celular-ayuda"
                className={`${TXT.micro} mt-1 text-left`}
                style={{ color: celularInvalido ? '#dc2626' : t.onSurfaceVariant }}
              >
                {celularInvalido
                  ? 'Ese número no es válido. Escribe un celular peruano real: 9 dígitos que empiecen con 9 (ej. 987 654 321).'
                  : 'Pon un número de celular real: te avisamos de tu pedido por WhatsApp a este número.'}
              </p>
            </div>

            {entregaDisponible === 'ambos' && (
              <div className="flex gap-2">
                {(['delivery', 'recojo'] as const).map((opcion) => (
                  <button
                    key={opcion}
                    type="button"
                    onClick={() => setEntrega(opcion)}
                    className={`flex-1 py-2.5 rounded-xl font-bold ${TXT.small} uppercase border transition-all`}
                    style={{
                      background: entrega === opcion ? t.primary : t.surface,
                      color: entrega === opcion ? t.onPrimary : t.onSurfaceVariant,
                      borderColor: entrega === opcion ? 'transparent' : `${t.outlineVariant}80`,
                    }}
                  >
                    {opcion === 'delivery' ? 'Delivery' : 'Recojo en tienda'}
                  </button>
                ))}
              </div>
            )}

            {entrega === 'delivery' && (
              <div>
                <label htmlFor="carrito-direccion" className={`block ${TXT.micro} font-bold uppercase mb-1`} style={{ color: t.onSurfaceVariant }}>
                  Dirección de entrega
                </label>
                <input
                  id="carrito-direccion"
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Calle, número, referencia"
                  className={`w-full border rounded-xl px-3 py-2.5 ${TXT.small} font-semibold focus:outline-none`}
                  style={{ borderColor: `${t.outlineVariant}80`, background: t.surface, color: t.onSurface }}
                />
                <button
                  type="button"
                  onClick={usarUbicacion}
                  disabled={ubicando}
                  className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${TXT.small} font-bold active:scale-95 transition-all disabled:opacity-60`}
                  style={{ borderColor: `${t.primary}66`, color: t.primary, background: `${t.primary}0d` }}
                >
                  <span className={`material-symbols-outlined ${ICON.md}`}>my_location</span>
                  {ubicando ? 'Ubicándote…' : 'Usar mi ubicación'}
                </button>
                {ubicMsg && <p className={`${TXT.micro} mt-1.5 leading-snug`} style={{ color: t.onSurfaceVariant }}>{ubicMsg}</p>}
              </div>
            )}
          </div>

          {faltantes.length > 0 && (
            <p className={`${TXT.small} font-semibold text-center`} style={{ color: t.onSurfaceVariant }}>
              Para confirmar falta: {faltantes.join(', ')}.
            </p>
          )}
          {pagoOnline && onPagarOnline && (
            <button
              onClick={async () => {
                if (!telefono || pagando) return;
                guardarCliente({ nombre: nombre.trim(), telefono });
                setPagando(true);
                try { await onPagarOnline({ nombre: nombre.trim(), telefono, entrega, direccion: direccion.trim() }); } finally { setPagando(false); }
              }}
              disabled={faltaNombre || faltaCelular || faltaDireccion || pagando}
              className={`w-full py-4 rounded-full font-bold ${TXT.lead} shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase disabled:opacity-50`}
              style={{ backgroundColor: t.primary, color: t.onPrimary }}
            >
              <span className={`material-symbols-outlined ${ICON.md}`}>credit_card</span>
              {pagando ? 'Abriendo pago…' : 'Pagar con tarjeta o Yape'}
            </button>
          )}
          <button
            onClick={() => {
              if (!telefono) return;
              guardarCliente({ nombre: nombre.trim(), telefono });
              onConfirmar({ nombre: nombre.trim(), telefono, entrega, direccion: direccion.trim() });
            }}
            disabled={faltaNombre || faltaCelular || faltaDireccion}
            className={`w-full py-4 rounded-full font-bold ${TXT.lead} shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase disabled:opacity-50 disabled:pointer-events-none`}
            style={{ backgroundColor: t.primary, color: t.onPrimary }}
          >
            <span className={`material-symbols-outlined ${ICON.md}`}>chat</span>
            Confirmar por WhatsApp
          </button>
          {!whatsappVisible && (
            <p className={`${TXT.micro} text-center`} style={{ color: t.onSurfaceVariant }}>
              Esta tienda todavía no configuró su WhatsApp de pedidos.
            </p>
          )}
          <button
            onClick={onVaciar}
            className={`w-full py-2 rounded-full font-bold ${TXT.small} uppercase transition-colors hover:opacity-70`}
            style={{ color: t.onSurfaceVariant }}
          >
            Vaciar Carrito
          </button>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   PROMO LATERAL (escritorio): una tarjeta de plato a la derecha del banner.
   Con más de un combo u oferta va rotando sola; se pausa al pasar el mouse.
   ════════════════════════════════════════════ */

export function PromoLateral({
  t, productos, onSelect, onAdd, titulo,
}: {
  t: StoreTheme;
  productos: Producto[];
  onSelect: (p: Producto) => void;
  onAdd: (p: Producto) => void;
  titulo?: string;
}) {
  const [indice, setIndice] = React.useState(0);
  const [pausa, setPausa] = React.useState(false);
  const n = productos?.length ?? 0;

  React.useEffect(() => {
    if (n < 2 || pausa) return;
    const id = window.setInterval(() => setIndice((i) => (i + 1) % n), 5000);
    return () => window.clearInterval(id);
  }, [n, pausa]);

  if (n === 0) return null;
  const p = productos[indice % n];
  const pct = p.priceAnterior && p.priceAnterior > p.price
    ? `-${Math.round((1 - p.price / p.priceAnterior) * 100)}%`
    : null;

  return (
    <div
      className="h-full rounded-2xl overflow-hidden border shadow-sm flex flex-col"
      style={{ background: t.surface, borderColor: `${t.outlineVariant}60` }}
      onMouseEnter={() => setPausa(true)}
      onMouseLeave={() => setPausa(false)}
    >
      <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
        <span className={`${TXT.small} font-black uppercase italic tracking-tight flex items-center gap-1`} style={{ color: t.onSurface }}>
          <span className="text-amber-500">🔥</span> {titulo || 'Promo del día'}
        </span>
        {n > 1 && (
          <div className="flex items-center gap-1">
            {productos.map((_, k) => (
              <button
                key={k}
                onClick={() => setIndice(k)}
                aria-label={`Ver promo ${k + 1}`}
                className="h-1.5 rounded-full transition-all"
                style={{ width: k === indice % n ? 16 : 6, background: k === indice % n ? t.primary : `${t.outlineVariant}` }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="relative flex-1 min-h-0 cursor-pointer group" onClick={() => onSelect(p)}>
        <img
          key={p.id}
          src={p.images?.[0] || p.image}
          alt={p.name}
          className="absolute inset-0 w-full h-full object-cover animate-fade-in group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
          {p.esCombo && (
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm">🔥 COMBO</span>
          )}
          {pct && (
            <span className="text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm" style={{ background: t.primary }}>{pct}</span>
          )}
        </div>
      </div>

      <div className="px-4 py-3 flex items-center gap-3">
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onSelect(p)}>
          <p className={`font-bold ${TXT.body} leading-tight line-clamp-2`} style={{ color: t.onSurface }}>{p.name}</p>
          <p className="mt-0.5 flex items-baseline gap-1.5">
            <span className={`font-black ${TXT.body}`} style={{ color: t.primary }}>{soles(p.price)}</span>
            {pct && p.priceAnterior && <span className={`${TXT.micro} line-through`} style={{ color: t.onSurfaceVariant }}>{soles(p.priceAnterior)}</span>}
          </p>
        </div>
        <button
          onClick={() => onAdd(p)}
          aria-label={`Agregar ${p.name}`}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-all shadow-md"
          style={{ background: t.primary, color: t.onPrimary }}
        >
          <span className={`material-symbols-outlined ${ICON.md}`}>add</span>
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   PESTAÑA: CONTACTO
   ════════════════════════════════════════════ */

export function ContactPanel({
  t, telefonoVisible, direccionVisible, horarioVisible, facebookVisible, instagramVisible, tiktokVisible, onEnviar, catalogo,
}: {
  t: StoreTheme;
  /** Tienda de catálogo (no de comida): el texto no habla de "mesa" ni de "eventos". */
  catalogo?: boolean;
  telefonoVisible: string | null;
  direccionVisible?: string | null;
  horarioVisible?: string | null;
  facebookVisible?: string | null;
  instagramVisible?: string | null;
  tiktokVisible?: string | null;
  onEnviar: (datos: { nombre: string; telefono: string; mensaje: string }) => void;
}) {
  const redes = [
    ...(facebookVisible ? [{ href: facebookVisible, label: 'Facebook' }] : []),
    ...(instagramVisible ? [{ href: instagramVisible, label: 'Instagram' }] : []),
    ...(tiktokVisible ? [{ href: tiktokVisible, label: 'TikTok' }] : []),
  ];
  const campos = [
    { name: 'nombre', label: 'Nombre Completo', type: 'text' },
    { name: 'telefono', label: 'Tu Teléfono', type: 'tel' },
  ];

  return (
    <div className="animate-fade-in px-5 py-8 max-w-[800px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
      <div className="space-y-6">
        <h3 className="font-black text-2xl uppercase italic" style={{ color: t.primary }}>¡Visítanos o Escríbenos!</h3>
        <p className={`${TXT.body} leading-relaxed`} style={{ color: t.onSurfaceVariant }}>
          {catalogo
            ? 'Cuéntanos qué necesitas y te respondemos por WhatsApp. Si tienes dudas, medidas especiales o pedidos grandes, ponte en contacto.'
            : 'Estamos listos para llevarte la mejor experiencia a tu mesa. Si tienes dudas, eventos especiales o pedidos corporativos, ponte en contacto.'}
        </p>
        <div className="space-y-4">
          {[
            // Direccion, telefono y horario: cada uno solo aparece si la tienda lo cargo
            // en su panel. Antes eran datos de relleno que salian igual para todas.
            ...(direccionVisible ? [{ icon: 'location_on', title: 'Nuestra Sede', desc: direccionVisible }] : []),
            ...(telefonoVisible ? [{ icon: 'call', title: 'Teléfono / WhatsApp', desc: telefonoVisible }] : []),
            ...(horarioVisible ? [{ icon: 'schedule', title: 'Horario de Atención', desc: horarioVisible }] : []),
          ].map((item) => (
            <div key={item.icon} className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                style={{ backgroundColor: t.primary, color: t.onPrimary }}
              >
                <span className={`material-symbols-outlined ${ICON.md}`}>{item.icon}</span>
              </div>
              <div>
                <h4 className={`font-bold ${TXT.body}`} style={{ color: t.onSurface }}>{item.title}</h4>
                <p className={`${TXT.small} mt-0.5`} style={{ color: t.onSurfaceVariant }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {redes.length > 0 && (
          <div className="flex gap-2.5 pt-1">
            {redes.map((r) => (
              <a
                key={r.label}
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={r.label}
                title={r.label}
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md transition-transform active:scale-90"
                style={{ backgroundColor: t.primary, color: t.onPrimary }}
              >
                <span className={`material-symbols-outlined ${ICON.md}`}>link</span>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="p-6 rounded-3xl border shadow-sm space-y-4" style={{ background: t.surface, borderColor: `${t.outlineVariant}40` }}>
        <h4 className={`font-bold ${TXT.lead} uppercase`} style={{ color: t.onSurface }}>Déjanos un Mensaje</h4>
        {/* El mensaje se abre en el WhatsApp de la tienda. Antes era un alert de mentira. */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            onEnviar({
              nombre: String(f.get('nombre') ?? ''),
              telefono: String(f.get('telefono') ?? ''),
              mensaje: String(f.get('mensaje') ?? ''),
            });
          }}
          className="space-y-3.5"
        >
          {campos.map((f) => (
            <div key={f.name}>
              <label
                htmlFor={`contacto-${f.name}`}
                className={`block ${TXT.micro} font-bold uppercase mb-1`}
                style={{ color: t.onSurfaceVariant }}
              >
                {f.label}
              </label>
              <input
                id={`contacto-${f.name}`}
                name={f.name}
                type={f.type}
                required
                className={`w-full border rounded-xl px-3 py-2 ${TXT.small} font-semibold focus:outline-none`}
                style={{ borderColor: `${t.outlineVariant}80`, background: t.surface, color: t.onSurface }}
                onFocus={(e) => (e.target.style.outline = `2px solid ${t.primary}`)}
                onBlur={(e) => (e.target.style.outline = 'none')}
              />
            </div>
          ))}
          <div>
            <label
              htmlFor="contacto-mensaje"
              className={`block ${TXT.micro} font-bold uppercase mb-1`}
              style={{ color: t.onSurfaceVariant }}
            >
              Mensaje o Consulta
            </label>
            <textarea
              id="contacto-mensaje"
              name="mensaje"
              rows={3}
              required
              className={`w-full border rounded-xl px-3 py-2 ${TXT.small} font-semibold focus:outline-none`}
              style={{ borderColor: `${t.outlineVariant}80`, background: t.surface, color: t.onSurface }}
              onFocus={(e) => (e.target.style.outline = `2px solid ${t.primary}`)}
              onBlur={(e) => (e.target.style.outline = 'none')}
            />
          </div>
          <button
            type="submit"
            className={`w-full py-3 rounded-full font-bold ${TXT.small} shadow-md uppercase active:scale-95 transition-all`}
            style={{ backgroundColor: t.primary, color: t.onPrimary }}
          >
            Enviar por WhatsApp
          </button>
        </form>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   NAV INFERIOR (movil)
   ════════════════════════════════════════════ */

export function BottomNav({
  t, tabs, active, onSelect, cartCount,
}: {
  t: StoreTheme;
  tabs: { id: string; icon: string; label: string }[];
  active: string;
  onSelect: (id: string) => void;
  cartCount: number;
}) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 flex justify-around items-center px-4 rounded-t-2xl shadow-lg"
      style={{ background: `${t.surface}F8`, backdropFilter: 'blur(20px)', borderTop: `1px solid ${t.outlineVariant}25` }}
    >
      {tabs.map((item) => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => { onSelect(item.id); window.scrollTo({ top: 0 }); }}
            className="flex flex-col items-center justify-center gap-0.5 transition-all relative flex-1"
            style={{
              color: isActive ? t.primary : t.onSurfaceVariant,
              fontWeight: isActive ? 700 : 400,
              opacity: isActive ? 1 : 0.7,
            }}
          >
            <span
              className={`material-symbols-outlined ${ICON.lg} transition-all`}
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
            {item.id === 'pedidos' && (
              <CartBadge t={t} count={cartCount} className="absolute top-0.5 right-[15%] min-w-4 h-4 px-1 text-[9px]" />
            )}
          </button>
        );
      })}
    </nav>
  );
}

/* ════════════════════════════════════════════
   FOOTER
   ════════════════════════════════════════════ */

export function StoreFooter({
  t, storeName, acciones,
}: {
  t: StoreTheme;
  storeName: string;
  acciones: { icon: string; label: string; onClick: () => void }[];
}) {
  return (
    <footer className="w-full py-8 mt-10" style={{ background: t.surfaceContainer, borderTop: `1px solid ${t.outlineVariant}40` }}>
      <div className="px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col gap-0.5 items-center md:items-start">
          <span className={`font-extrabold italic uppercase tracking-tight ${TXT.lead}`} style={{ color: t.primary }}>
            {storeName}
          </span>
          <p className={TXT.small} style={{ color: t.onSurfaceVariant }}>
            © {new Date().getFullYear()}. Todos los derechos reservados.
          </p>
        </div>
        <div className="flex gap-2">
          {acciones.map((s) => (
            <button
              key={s.icon}
              onClick={s.onClick}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
              style={{ background: `${t.primary}15`, color: t.primary }}
              onMouseEnter={(e) => { e.currentTarget.style.background = t.primary; e.currentTarget.style.color = t.onPrimary; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = `${t.primary}15`; e.currentTarget.style.color = t.primary; }}
              aria-label={s.label}
              title={s.label}
            >
              <span className={`material-symbols-outlined ${ICON.sm}`}>{s.icon}</span>
            </button>
          ))}
        </div>
      </div>
    </footer>
  );
}
