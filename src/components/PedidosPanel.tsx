"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { leerMisPedidos, type PedidoLocal } from '@/lib/pedidos';

type Vivo = { estado: string; total: number };
const colorEstado = (e: string) =>
  e === 'Entregado' ? 'bg-blue-50 text-blue-700 border-blue-200'
  : e === 'Cancelado' ? 'bg-red-50 text-red-700 border-red-200'
  : e === 'Pendiente' ? 'bg-orange-50 text-orange-700 border-orange-200'
  : 'bg-green-50 text-green-700 border-green-200';

// Panel de Favoritos (Me gusta). Se muestra en la pestaña "Favoritos" del perfil
// y en /orders. Los favoritos viven en localStorage ('boga_favorites').
export default function PedidosPanel() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const { addToCart } = useCart();
  // Pedidos de la carta hechos desde este dispositivo, con su estado al día
  const [misPedidos, setMisPedidos] = useState<PedidoLocal[]>([]);
  const [vivo, setVivo] = useState<Record<string, Vivo>>({});

  useEffect(() => {
    const lista = leerMisPedidos().slice(0, 10);
    setMisPedidos(lista);
    lista.forEach((p) => {
      fetch(`/api/pedido/${encodeURIComponent(p.codigo)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d) setVivo((v) => ({ ...v, [p.codigo]: { estado: d.estado, total: d.total } })); })
        .catch(() => {});
    });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('boga_favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const removeFavorite = (id: string | number) => {
    const updated = favorites.filter(f => String(f.id) !== String(id));
    setFavorites(updated);
    localStorage.setItem('boga_favorites', JSON.stringify(updated));
  };

  return (
    <div className="flex flex-col gap-5">
      {misPedidos.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-headline-lg text-on-surface text-xl sm:text-2xl font-extrabold">Mis pedidos</h2>
          <p className="text-secondary font-body-md text-xs sm:text-sm -mt-1">Los pedidos que hiciste desde este celular.</p>
          <p className="text-[11px] text-secondary bg-surface-container-low border border-surface-container-highest rounded-xl px-3 py-2 leading-relaxed">
            Cada pedido es <b>directo con la tienda</b>: ella lo prepara, lo cobra y lo entrega o lo deja listo para recoger.
            BogaHub solo te conecta con ella. Para cualquier duda del pedido, escríbele a la tienda por WhatsApp.
          </p>
          {misPedidos.map((p) => {
            const v = vivo[p.codigo];
            return (
              <Link key={p.codigo} href={`/pedido/${p.codigo}`}
                className="bg-white rounded-2xl p-4 flex items-center gap-3 border border-surface-container-highest hover:border-primary/40 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="font-headline-sm text-sm text-on-surface font-bold truncate">{p.tienda}</p>
                  <p className="text-[11px] text-secondary">
                    N° {p.codigo.toUpperCase()} · {new Date(p.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                    {v ? ` · S/ ${v.total.toFixed(2)}` : ''}
                  </p>
                </div>
                {v && <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${colorEstado(v.estado)}`}>{v.estado}</span>}
                <span className="material-symbols-outlined text-secondary text-[18px]">chevron_right</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Título de la sección */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="font-headline-lg text-on-surface text-xl sm:text-2xl font-extrabold">
            Mis Favoritos
          </h1>
          {favorites.length > 0 && (
            <span className="bg-primary/10 text-primary text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              {favorites.length}
            </span>
          )}
        </div>
        <p className="text-secondary font-body-md text-xs sm:text-sm">
          Los productos que marcaste con ❤️ para comprar más tarde.
        </p>
      </div>

      {/* Contenido de favoritos */}
      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-white rounded-2xl shadow-[0_15px_15px_rgba(0,0,0,0.04)] border border-surface-container-highest">
          <div className="w-16 h-16 bg-primary-fixed/60 text-primary rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              favorite
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-on-surface mb-1">
            Aún no tienes favoritos
          </h3>
          <p className="text-secondary text-xs sm:text-sm max-w-xs leading-relaxed">
            Explora las tiendas y dale &quot;me gusta&quot; a los productos para encontrarlos rápido aquí.
          </p>
          <Link 
            href="/market" 
            className="mt-6 px-6 py-2.5 bg-primary text-white font-bold rounded-full hover:bg-primary-container transition-all text-sm shadow-md active:scale-95 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">storefront</span>
            Explorar productos
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {favorites.map((prod) => (
            <div 
              key={prod.id} 
              className="bg-white rounded-2xl shadow-[0_10px_15px_rgba(0,0,0,0.03)] p-4 flex items-center justify-between border border-surface-container-highest relative gap-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-container-low flex-shrink-0 shadow-sm border border-surface-container-highest">
                  <img 
                    alt={prod.title} 
                    className="w-full h-full object-cover" 
                    src={prod.image || '/logo-mark.svg'} 
                  />
                </div>
                <div className="min-w-0 flex-1">
                  {prod.store && (
                    <div className="flex items-center gap-1">
                      {prod.logo && (
                        <img 
                          alt={prod.store} 
                          className="w-3.5 h-3.5 rounded-full object-cover border border-surface-container-highest" 
                          src={prod.logo} 
                        />
                      )}
                      <span className="text-[10px] font-label-md text-secondary uppercase truncate">
                        {prod.store}
                      </span>
                    </div>
                  )}
                  <h4 className="font-headline-sm text-sm text-on-surface font-bold mt-0.5 line-clamp-1">
                    {prod.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-primary font-price-lg font-bold mt-0.5">
                    {prod.price}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0 z-10">
                <button 
                  onClick={() => removeFavorite(prod.id)}
                  className="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center active:scale-90 transition-transform border border-red-100 shrink-0"
                  title="Quitar de favoritos"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
                <button 
                  onClick={() => addToCart(prod)}
                  className="bg-primary text-white hover:bg-primary-container transition-all font-bold text-[11px] px-3.5 py-2 rounded-full whitespace-nowrap active:scale-95 flex items-center gap-1 shadow-md shrink-0"
                >
                  <span className="material-symbols-outlined text-[14px]">add_shopping_cart</span>
                  Agregar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
