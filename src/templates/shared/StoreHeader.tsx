'use client';

import CustomerAccountButton from '@/components/CustomerAccountButton';
import React, { useState, useEffect } from 'react';
import type { StoreConfig } from '@/lib/stores.config';
import { TXT, ICON, inicialesDe } from './tokens';
import { CartBadge, AddedToast } from './AddFeedback';

interface Tab {
  id: string;
  label: string;
}

/**
 * Header de las plantillas de comida: barra fija de escritorio con navegacion y
 * carrito, y barra compacta en movil.
 *
 * Las pestañas se pasan por prop porque no todas las plantillas tienen las
 * mismas: la de menu directo no tiene "Inicio".
 */
export default function StoreHeader({
  store, tabs, active, onSelect, cartCount, onCarrito, ctaLabel = 'Pedir ahora', onCta, nombreRecto = false, menuDe,
}: {
  store: StoreConfig;
  tabs: Tab[];
  active: string;
  onSelect: (id: string) => void;
  cartCount: number;
  /** Sin esta función no hay carrito en el encabezado (empresas de servicios: se cotiza, no se compra). */
  onCarrito?: () => void;
  ctaLabel?: string;
  onCta: () => void;
  /** Nombre en letra recta en vez de cursiva (más sobrio: empresas de servicios). */
  nombreRecto?: boolean;
  /**
   * Menú desplegable bajo una pestaña (solo escritorio): al pasar el mouse sobre `tabId` se abre un
   * panel con tarjetas (foto + nombre). Tocar la pestaña sigue llevando a su sección.
   */
  menuDe?: { tabId: string; items: { id: string; nombre: string; imagen?: string }[]; onItem: (id: string) => void };
}) {
  const t = store.theme;
  // Al cambiar de pestaña se sube al inicio: si no, quien tocaba Pedidos desde el
  // fondo del menu llegaba al carrito con el scroll abajo y no veia los items ni el formulario.
  const alInicio = () => window.scrollTo({ top: 0 });
  const seleccionar = (id: string) => { onSelect(id); alInicio(); };
  const irAlCarrito = () => { onCarrito?.(); alInicio(); };
  const [isScrolled, setIsScrolled] = useState(false);
  const iniciales = inicialesDe(store.name);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const logo = (size: string, rounded: string) =>
    store.logoImage ? (
      <img
        src={store.logoImage}
        alt={store.name}
        className={`${size} rounded-full object-cover shrink-0`}
      />
    ) : (
      <div
        className={`${size} ${rounded} flex items-center justify-center shrink-0 shadow-md`}
        style={{ background: t.primary }}
      >
        <span className={`font-black ${TXT.body} italic`} style={{ color: t.onPrimary }}>{iniciales}</span>
      </div>
    );

  return (
    <>
      {/* ── ESCRITORIO ── */}
      <header
        className={`hidden md:flex fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${isScrolled ? 'shadow-md py-2' : 'py-3'}`}
        style={{ background: `${t.surface}F8`, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${t.outlineVariant}30` }}
      >
        <div className="px-6 w-full flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 min-w-0">
            {logo('w-9 h-9', 'rounded-full')}
            {/* truncate: los nombres largos empujaban el nav y el carrito fuera de pantalla */}
            <span className={`text-xl font-black ${nombreRecto ? '' : 'italic'} tracking-tight uppercase truncate max-w-[240px] pr-2`} style={{ color: t.primary }}>
              {store.name}
            </span>
          </div>

          <nav className="flex items-center gap-8 shrink-0">
            {tabs.map((item) => {
              const conMenu = menuDe && menuDe.tabId === item.id && menuDe.items.length > 0;
              const boton = (
                <button
                  key={item.id}
                  onClick={() => seleccionar(item.id)}
                  className={`font-bold ${TXT.body} uppercase tracking-wide transition-all relative flex items-center gap-1`}
                  style={{
                    color: active === item.id ? t.primary : t.onSurfaceVariant,
                    fontWeight: active === item.id ? 700 : 500,
                  }}
                >
                  {item.label}
                  {conMenu && <span className={`material-symbols-outlined ${ICON.sm} transition-transform group-hover/menu:rotate-180`}>expand_more</span>}
                  {active === item.id && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full" style={{ background: t.primary }} />
                  )}
                </button>
              );
              if (!conMenu || !menuDe) return boton;
              return (
                // Sin `relative`: el panel se ancla al encabezado (que es fixed) y ocupa todo el ancho.
                // py-6 -my-6 estira la zona de hover hasta el borde del encabezado para que no se cierre al bajar el mouse.
                <div key={item.id} className="group/menu py-6 -my-6">
                  {boton}
                  <div className="absolute left-0 right-0 top-full hidden group-hover/menu:block group-focus-within/menu:block z-50">
                    <div className="w-full shadow-2xl" style={{ background: t.surface, borderTop: `1px solid ${t.outlineVariant}60`, borderBottom: `1px solid ${t.outlineVariant}60` }}>
                      <div className="max-w-6xl mx-auto px-6 py-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {menuDe.items.map((it) => (
                          <button
                            key={it.id}
                            onClick={() => menuDe.onItem(it.id)}
                            className="flex items-center gap-3 p-2.5 rounded-xl text-left normal-case transition-colors hover:brightness-95"
                            style={{ background: t.surfaceContainerLow }}
                          >
                            {it.imagen ? (
                              <img src={it.imagen} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                            ) : (
                              <span className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center" style={{ background: `${t.primary}15`, color: t.primary }}>
                                <span className={`material-symbols-outlined ${ICON.md}`}>construction</span>
                              </span>
                            )}
                            <span className={`${TXT.body} font-bold leading-tight line-clamp-2`} style={{ color: t.onSurface }}>{it.nombre}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onCta}
              className={`font-bold px-6 py-2.5 rounded-full ${TXT.body} transition-all hover:brightness-110 active:scale-95 shadow-md`}
              style={{ background: t.primary, color: t.onPrimary, boxShadow: `0 4px 14px ${t.primary}40` }}
            >
              {ctaLabel}
            </button>
            {onCarrito && (
              <button
                onClick={irAlCarrito}
                className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all"
                style={{ background: `${t.primary}15`, color: t.primary }}
                aria-label={`Ver pedido (${cartCount})`}
              >
                <span className={`material-symbols-outlined ${ICON.md}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                  shopping_cart
                </span>
                <CartBadge t={t} count={cartCount} className="absolute -top-1 -right-1 min-w-4 h-4 px-1 text-[9px]" />
              </button>
            )}
            <CustomerAccountButton variant="encabezado" background={`${t.primary}15`} color={t.primary} />
          </div>
        </div>
      </header>

      {/* ── MOVIL ── */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 h-16 shadow-sm transition-all duration-300"
        style={{ background: `${t.surface}F8`, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${t.outlineVariant}30` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {logo('w-9 h-9', 'rounded-full')}
          <div className="flex flex-col min-w-0">
            <h1 className={`${TXT.lead} font-black ${nombreRecto ? '' : 'italic'} tracking-tighter uppercase leading-none truncate pr-1.5`} style={{ color: t.primary }}>
              {store.name}
            </h1>
            <p className={`${TXT.micro} font-bold uppercase tracking-wider truncate`} style={{ color: t.onSurfaceVariant }}>
              {store.tagline}
            </p>
          </div>
        </div>
        <CustomerAccountButton variant="encabezado" background={`${t.primary}15`} color={t.primary} />
      </header>

      {/* En Pedidos el aviso sobra: ya se ve el carrito. */}
      {onCarrito && active !== 'pedidos' && <AddedToast t={t} onVerPedido={irAlCarrito} />}
    </>
  );
}
