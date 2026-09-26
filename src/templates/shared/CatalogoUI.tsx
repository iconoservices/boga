'use client';

import React, { useEffect } from 'react';
import { guardarCliente, leerCliente, normalizarCelular } from '@/lib/cliente';
import type { StoreTheme } from '@/lib/templates.config';
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

/* ════════════════════════════════════════════
   GRILLA DE PRODUCTOS
   ════════════════════════════════════════════ */

export function ProductGrid({
  t, productos, onSelect, onAdd, onVerTodo,
}: {
  t: StoreTheme;
  productos: Producto[];
  onSelect: (p: Producto) => void;
  onAdd: (p: Producto) => void;
  onVerTodo?: () => void;
}) {
  // Antes una categoria sin productos dejaba la pantalla en blanco.
  if (productos.length === 0) {
    return (
      <div className="py-16 text-center">
        <span className={`material-symbols-outlined ${ICON.xl} mb-3 block`} style={{ color: `${t.onSurfaceVariant}80` }}>
          restaurant_menu
        </span>
        <p className={`font-bold ${TXT.body}`} style={{ color: t.onSurface }}>
          Todavía no hay platos en esta categoría
        </p>
        {onVerTodo && (
          <button
            onClick={onVerTodo}
            className={`mt-4 px-6 py-2.5 rounded-full font-bold ${TXT.small} uppercase active:scale-95 transition-all`}
            style={{ background: t.primary, color: t.onPrimary }}
          >
            Ver todo el menú
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
          <div className="aspect-square overflow-hidden relative">
            <img
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              alt={product.name}
              src={product.image}
            />
          </div>
          <div className="p-2.5 flex flex-col flex-1">
            <h4 className={`font-bold ${TXT.body} leading-tight mb-1 line-clamp-2`} style={{ color: t.onSurface }}>
              {product.name}
            </h4>
            <p className={`${TXT.micro} mb-2 line-clamp-2 flex-1`} style={{ color: t.onSurfaceVariant }}>
              {product.desc}
            </p>
            <div className="flex justify-between items-center mt-auto">
              <span className={`font-extrabold ${TXT.lead}`} style={{ color: t.primary }}>
                {soles(product.price)}
                {product.priceAnterior && (
                  <span className={`block ${TXT.micro} font-medium line-through`} style={{ color: t.onSurfaceVariant }}>{soles(product.priceAnterior)}</span>
                )}
              </span>
              <AddButton t={t} nombre={product.name} onAdd={() => onAdd(product)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════
   MODAL DE PRODUCTO
   ════════════════════════════════════════════ */

export function ProductModal({
  t, producto, productos = [], onClose, onAdd, onSelect,
}: {
  t: StoreTheme;
  producto: Producto | null;
  /** Catalogo completo de la tienda: de aca salen los "Tambien te puede interesar". */
  productos?: Producto[];
  onClose: () => void;
  onAdd: (p: Producto) => void;
  /** Para poder tocar un sugerido y que el modal cambie al producto elegido. */
  onSelect?: (p: Producto) => void;
}) {
  const [agregado, setAgregado] = React.useState(false);
  const cierre = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const contenedor = React.useRef<HTMLDivElement>(null);

  // Al cambiar de producto (por ejemplo tocando un sugerido) se limpia el boton y
  // se vuelve arriba: el modal conserva el scroll y si no, el nuevo producto
  // aparecia con la pantalla ya en la zona de sugeridos.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAgregado(false);
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

      <div className="w-full h-64 md:h-[420px]">
        <img className="w-full h-full object-cover" alt={producto.name} src={producto.image} />
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-5 pb-28">
        <h2 className={`font-bold ${TXT.title}`} style={{ color: t.onSurface }}>{producto.name}</h2>
        {producto.desc && (
          <p className={`${TXT.body} mt-2 leading-relaxed`} style={{ color: t.onSurfaceVariant }}>{producto.desc}</p>
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
        <div className="w-full max-w-2xl flex items-center justify-between gap-4 px-1">
          <span className="font-black text-xl" style={{ color: t.primary }}>
            {soles(producto.price)}
            {producto.priceAnterior && (
              <span className="ml-2 text-sm font-medium line-through" style={{ color: t.onSurfaceVariant }}>{soles(producto.priceAnterior)}</span>
            )}
          </span>
          <button
            onClick={() => {
              // El modal se queda abierto: abajo hay sugeridos y el cliente
              // puede seguir agregando o mirando mas platos sin salir de aca.
              onAdd(producto);
              setAgregado(true);
              if (cierre.current) clearTimeout(cierre.current);
              cierre.current = setTimeout(() => setAgregado(false), 1200);
            }}
            className={`px-6 py-2.5 rounded-full font-bold ${TXT.body} flex items-center gap-1.5 transition-[background-color,transform] active:scale-95 ${agregado ? 'add-btn-pop' : ''}`}
            style={{ background: agregado ? '#16a34a' : t.primary, color: agregado ? '#fff' : t.onPrimary }}
          >
            <span className={`material-symbols-outlined ${ICON.sm}`}>{agregado ? 'check' : 'add'}</span>
            {agregado ? 'Agregado' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   PESTAÑA: PEDIDOS
   ════════════════════════════════════════════ */

export function CartPanel({
  t, cartItems, subtotal, onAdd, onRemove, onVaciar, onConfirmar, onIrAlMenu, whatsappVisible,
}: {
  t: StoreTheme;
  cartItems: { producto: Producto; qty: number }[];
  subtotal: number;
  onAdd: (p: Producto) => void;
  onRemove: (id: string) => void;
  onVaciar: () => void;
  onConfirmar: (datos: { nombre: string; telefono: string; entrega: 'delivery' | 'recojo'; direccion: string }) => void;
  onIrAlMenu: () => void;
  whatsappVisible: boolean;
}) {
  // Antes el pedido se mandaba por WhatsApp con solo los items y el total: el
  // dueño tenia que volver a preguntar quien pedia y si era delivery o recojo.
  // Pedirlo aca hace que el primer mensaje ya venga completo.
  const [nombre, setNombre] = React.useState('');
  const [entrega, setEntrega] = React.useState<'delivery' | 'recojo'>('delivery');
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
    <div className="animate-fade-in px-5 py-8 max-w-[600px] mx-auto text-center space-y-6">
      <div
        className="w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-inner"
        style={{ backgroundColor: `${t.primary}15` }}
      >
        <span className={`material-symbols-outlined ${ICON.xl}`} style={{ color: t.primary }}>
          shopping_cart_checkout
        </span>
      </div>

      {cartItems.length === 0 ? (
        <div className="space-y-4">
          <h3 className={`font-bold ${TXT.title}`}>Tu carrito está vacío</h3>
          <p className={`${TXT.body} max-w-xs mx-auto`} style={{ color: t.onSurfaceVariant }}>
            Explora nuestro delicioso menú y agrega tus combos o platos favoritos.
          </p>
          <button
            onClick={onIrAlMenu}
            className={`px-8 py-3 rounded-full font-bold ${TXT.body} shadow-md uppercase inline-block active:scale-95 transition-all`}
            style={{ backgroundColor: t.primary, color: t.onPrimary }}
          >
            Ir al Menú
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
                key={l.producto.id}
                className="flex items-center gap-3 pb-3 border-b"
                style={{ borderColor: `${t.outlineVariant}40` }}
              >
                <img src={l.producto.image} alt={l.producto.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className={`font-bold ${TXT.body} leading-tight line-clamp-2`} style={{ color: t.onSurface }}>
                    {l.producto.name}
                  </p>
                  <p className={TXT.micro} style={{ color: t.onSurfaceVariant }}>{soles(l.producto.price)} c/u</p>
                </div>
                {/* Total y controles apilados: en una sola fila el nombre quedaba en "Pa..." a 375px */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`font-black ${TXT.body}`} style={{ color: t.primary }}>
                    {soles(l.producto.price * l.qty)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onRemove(l.producto.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-all"
                      style={{ background: `${t.primary}15`, color: t.primary }}
                      aria-label={`Quitar uno de ${l.producto.name}`}
                    >
                      <span className={`material-symbols-outlined ${ICON.sm}`}>remove</span>
                    </button>
                    <span className={`font-black ${TXT.body} w-5 text-center`} style={{ color: t.onSurface }}>{l.qty}</span>
                    <button
                      onClick={() => onAdd(l.producto)}
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
              </div>
            )}
          </div>

          {faltantes.length > 0 && (
            <p className={`${TXT.small} font-semibold text-center`} style={{ color: t.onSurfaceVariant }}>
              Para confirmar falta: {faltantes.join(', ')}.
            </p>
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
   PESTAÑA: CONTACTO
   ════════════════════════════════════════════ */

export function ContactPanel({
  t, telefonoVisible, direccionVisible, horarioVisible, facebookVisible, instagramVisible, tiktokVisible, onEnviar,
}: {
  t: StoreTheme;
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
          Estamos listos para llevarte la mejor experiencia a tu mesa. Si tienes dudas, eventos especiales o pedidos
          corporativos, ponte en contacto.
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
