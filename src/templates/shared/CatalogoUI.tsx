'use client';

import React, { useEffect } from 'react';
import type { StoreTheme } from '@/lib/templates.config';
import { TXT, ICON, soles, type Producto, type Categoria } from './tokens';

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
      className={`px-5 md:px-6 md:max-w-[1200px] md:mx-auto overflow-x-auto flex gap-3 whitespace-nowrap sticky ${sticky} py-3 z-40`}
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
            <span
              className={`material-symbols-outlined ${ICON.sm}`}
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              {tab.icon}
            </span>
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
          <div className="p-3 flex flex-col flex-1">
            <h4 className={`font-bold ${TXT.body} leading-tight mb-1 line-clamp-2`} style={{ color: t.onSurface }}>
              {product.name}
            </h4>
            <p className={`${TXT.micro} mb-3 line-clamp-2 flex-1`} style={{ color: t.onSurfaceVariant }}>
              {product.desc}
            </p>
            <div className="flex justify-between items-center mt-auto">
              <span className={`font-extrabold ${TXT.lead}`} style={{ color: t.primary }}>
                {soles(product.price)}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onAdd(product); }}
                className="w-8 h-8 rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
                style={{ background: t.primary, color: t.onPrimary }}
                aria-label={`Agregar ${product.name} al pedido`}
              >
                <span className={`material-symbols-outlined ${ICON.sm}`}>add</span>
              </button>
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
  t, producto, onClose, onAdd,
}: {
  t: StoreTheme;
  producto: Producto | null;
  onClose: () => void;
  onAdd: (p: Producto) => void;
}) {
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

  if (!producto) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={producto.name}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ background: t.surface }}
      >
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center z-10"
            style={{ background: 'rgba(0,0,0,0.4)', color: '#fff' }}
            aria-label="Cerrar"
          >
            <span className={`material-symbols-outlined ${ICON.sm}`}>close</span>
          </button>
          <div className="aspect-square">
            <img className="w-full h-full object-cover" alt={producto.name} src={producto.image} />
          </div>
        </div>
        <div className="p-5">
          <h2 className={`font-bold ${TXT.title}`} style={{ color: t.onSurface }}>{producto.name}</h2>
          {producto.desc && (
            <p className={`${TXT.body} mt-2 leading-relaxed`} style={{ color: t.onSurfaceVariant }}>{producto.desc}</p>
          )}
          <div className="flex items-center justify-between mt-5">
            <span className="font-black text-xl" style={{ color: t.primary }}>{soles(producto.price)}</span>
            <button
              onClick={() => { onAdd(producto); onClose(); }}
              className={`px-6 py-2.5 rounded-full font-bold ${TXT.body} flex items-center gap-1.5 transition-transform active:scale-95`}
              style={{ background: t.primary, color: t.onPrimary }}
            >
              <span className={`material-symbols-outlined ${ICON.sm}`}>add</span>
              Agregar
            </button>
          </div>
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
  onConfirmar: () => void;
  onIrAlMenu: () => void;
  whatsappVisible: boolean;
}) {
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

          <button
            onClick={onConfirmar}
            className={`w-full py-4 rounded-full font-bold ${TXT.lead} shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase`}
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
  t, telefonoVisible, direccionVisible, horarioVisible, onEnviar,
}: {
  t: StoreTheme;
  telefonoVisible: string | null;
  direccionVisible?: string | null;
  horarioVisible?: string | null;
  onEnviar: (datos: { nombre: string; telefono: string; mensaje: string }) => void;
}) {
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
            onClick={() => onSelect(item.id)}
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
            {item.id === 'pedidos' && cartCount > 0 && (
              <span
                className="absolute top-0.5 right-[15%] w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                style={{ background: t.primary, color: t.onPrimary }}
              >
                {cartCount}
              </span>
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
      <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
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
