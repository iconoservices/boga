'use client';

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
  store, tabs, active, onSelect, cartCount, onCarrito, ctaLabel = 'Pedir ahora', onCta,
}: {
  store: StoreConfig;
  tabs: Tab[];
  active: string;
  onSelect: (id: string) => void;
  cartCount: number;
  onCarrito: () => void;
  ctaLabel?: string;
  onCta: () => void;
}) {
  const t = store.theme;
  // Al cambiar de pestaña se sube al inicio: si no, quien tocaba Pedidos desde el
  // fondo del menu llegaba al carrito con el scroll abajo y no veia los items ni el formulario.
  const alInicio = () => window.scrollTo({ top: 0 });
  const seleccionar = (id: string) => { onSelect(id); alInicio(); };
  const irAlCarrito = () => { onCarrito(); alInicio(); };
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
            <span className="text-xl font-black italic tracking-tight uppercase truncate max-w-[240px]" style={{ color: t.primary }}>
              {store.name}
            </span>
          </div>

          <nav className="flex items-center gap-8 shrink-0">
            {tabs.map((item) => (
              <button
                key={item.id}
                onClick={() => seleccionar(item.id)}
                className={`font-bold ${TXT.body} uppercase tracking-wide transition-all relative`}
                style={{
                  color: active === item.id ? t.primary : t.onSurfaceVariant,
                  fontWeight: active === item.id ? 700 : 500,
                }}
              >
                {item.label}
                {active === item.id && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full" style={{ background: t.primary }} />
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onCta}
              className={`font-bold px-6 py-2.5 rounded-full ${TXT.body} transition-all hover:brightness-110 active:scale-95 shadow-md`}
              style={{ background: t.primary, color: t.onPrimary, boxShadow: `0 4px 14px ${t.primary}40` }}
            >
              {ctaLabel}
            </button>
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
            <h1 className={`${TXT.lead} font-black italic tracking-tighter uppercase leading-none truncate`} style={{ color: t.primary }}>
              {store.name}
            </h1>
            <p className={`${TXT.micro} font-bold uppercase tracking-wider truncate`} style={{ color: t.onSurfaceVariant }}>
              {store.tagline}
            </p>
          </div>
        </div>
      </header>

      {/* En Pedidos el aviso sobra: ya se ve el carrito. */}
      {active !== 'pedidos' && <AddedToast t={t} onVerPedido={irAlCarrito} />}
    </>
  );
}
