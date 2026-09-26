"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useCart } from '@/context/CartContext';
import { fetchCatalogo } from '@/lib/catalogo';
import { hrefTienda, esFuera } from '@/lib/tiendaUrl';
import { porcentajeOferta } from '@/lib/ofertas';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Promos de BogaHub: todos los productos que las tiendas tienen en oferta ahora mismo. El dueño marca la
// oferta desde su panel (Productos → editar → «Precio en oferta»); /api/catalog manda el precio vigente
// como `price` y el normal como `price_anterior`. Sin ninguna oferta, se ve un aviso; nunca datos de muestra.

type Promo = {
  id: string; name: string; image: string; precio: number; anterior: number;
  storeSlug: string; storeName: string; storeExternalUrl?: string; categoria: string;
};

const soles = (n: number) => `S/ ${n.toFixed(2)}`;

export default function Promotions() {
  const { cartCount, setIsCartOpen } = useCart();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('Todos');

  useEffect(() => {
    fetchCatalogo().then(({ stores, products }) => {
      const tiendas: Record<string, any> = {};
      (stores || []).forEach((s: any) => { tiendas[s.slug] = s; });
      setPromos(
        (products || [])
          .filter((p: any) => p.price_anterior > 0 && p.status !== 'Agotado' && tiendas[p.store])
          .map((p: any) => ({
            id: p.id, name: p.name, image: p.image || '', precio: Number(p.price) || 0, anterior: Number(p.price_anterior) || 0,
            storeSlug: p.store, storeName: tiendas[p.store].name, storeExternalUrl: tiendas[p.store].external_url || undefined,
            categoria: p.category || 'Otros',
          }))
          // las de mayor descuento primero
          .sort((a: Promo, b: Promo) => (b.anterior - b.precio) / b.anterior - (a.anterior - a.precio) / a.anterior),
      );
      setCargando(false);
    });
  }, []);

  const categorias = ['Todos', ...Array.from(new Set(promos.map((p) => p.categoria)))];
  const visibles = filtro === 'Todos' ? promos : promos.filter((p) => p.categoria === filtro);

  return (
    <>
      <AppHeader cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />

      <main className="max-w-[1440px] mx-auto px-container-margin w-full pt-6 flex flex-col gap-6 lg:gap-8 pb-12">
        <div className="flex flex-col gap-1">
          <h1 className="font-headline-lg text-on-surface">Promos</h1>
          <p className="text-secondary font-body-md text-sm">Ofertas y combos de las tiendas de Pucallpa</p>
        </div>

        {cargando ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-surface-container-low animate-pulse" />
            ))}
          </div>
        ) : promos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center bg-white border border-surface-container-highest rounded-2xl shadow-sm px-6">
            <span className="material-symbols-outlined text-primary/60 text-[44px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_offer</span>
            <h2 className="font-headline-sm text-lg text-on-surface">Muy pronto, las ofertas de las tiendas</h2>
            <p className="text-secondary font-body-md text-sm max-w-[42ch]">
              Aún no hay promos publicadas. Cuando las tiendas activen sus ofertas, las verás acá.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              <Link href="/explore" className="bg-primary text-on-primary font-label-md text-sm font-bold px-5 py-2 rounded-full">
                Ver tiendas
              </Link>
              <Link href="/negocios" className="bg-white border border-surface-container-highest text-primary font-label-md text-sm font-bold px-5 py-2 rounded-full">
                Tengo un negocio
              </Link>
            </div>
          </div>
        ) : (
          <>
            {categorias.length > 2 && (
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1" style={{ scrollbarWidth: 'none' }}>
                {categorias.map((c) => (
                  <button
                    key={c}
                    onClick={() => setFiltro(c)}
                    className={`px-4 py-2 rounded-full text-[12px] font-label-md shrink-0 transition-all shadow-sm active:scale-95 ${
                      filtro === c
                        ? 'bg-primary text-white border border-primary shadow-md'
                        : 'bg-white border border-surface-container-highest text-secondary hover:shadow-md'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
              {visibles.map((p) => {
                const href = hrefTienda(p.storeSlug, p.storeExternalUrl);
                return (
                  <Link
                    key={p.id}
                    href={href}
                    target={esFuera(href) ? '_blank' : undefined}
                    rel={esFuera(href) ? 'noopener' : undefined}
                    className="group bg-white rounded-2xl shadow-[0_15px_15px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col border border-surface-container-highest hover:border-primary/30 transition-all"
                  >
                    <div className="relative aspect-square overflow-hidden bg-surface-container-low">
                      {p.image && <img loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={p.image} alt={p.name} />}
                      <div className="absolute top-2 left-2 bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm">
                        {porcentajeOferta(p.anterior, p.precio)}
                      </div>
                    </div>
                    <div className="p-3 flex flex-col gap-0.5">
                      <span className="font-label-md text-[9px] text-secondary uppercase tracking-wide truncate">{p.storeName}</span>
                      <h3 className="font-headline-sm text-sm text-on-surface line-clamp-2 leading-tight">{p.name}</h3>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="font-price-lg text-primary text-base">{soles(p.precio)}</span>
                        <span className="text-secondary font-body-md text-[11px] line-through">{soles(p.anterior)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
    </>
  );
}
