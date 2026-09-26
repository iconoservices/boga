'use client';

// Banner del Market (los que carga el superadmin en «Banners de portada» para /market). Sin banners
// activos no se muestra nada (antes salían 3 fotos de stock como relleno). Vive en Explorar.
// Lee del mismo catálogo cacheado (fetchCatalogo) que usan las páginas del Market.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchCatalogo } from '@/lib/catalogo';
import { BannerOverlay, type BannerStyle } from '@/components/BannerOverlay';

type Banner = { id: string; img: string; tag: string | null; title1: string | null; title2: string | null; sub: string | null; link: string | null; pura: boolean };

export default function MarketBannerSlider() {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [bannerIdx, setBannerIdx] = useState(0);
  const bannerIdxRef = useRef(0);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerStyle, setBannerStyle] = useState<BannerStyle>('center');
  const bannerCount = banners.length;

  useEffect(() => {
    let vivo = true;
    fetchCatalogo().then(({ banners: dbBannersData, bannerStyle: dbBannerStyle }) => {
      if (!vivo) return;
      setBannerStyle(dbBannerStyle);
      if (dbBannersData && dbBannersData.length > 0) {
        setBanners(dbBannersData.map((b: any) => {
          const conTexto = b.show_text !== false && (b.tag || b.title1 || b.title2 || b.sub);
          return {
            id: b.id, img: b.image, link: b.link,
            // Sin texto (imagen ya armada, ej. un flyer de Canva): no se le pisa nada encima, y la imagen
            // se ve completa (object-contain) en vez de recortada a la fuerza al ratio del banner.
            tag: conTexto ? b.tag : null,
            title1: conTexto ? b.title1 : null,
            title2: conTexto ? b.title2 : null,
            sub: conTexto ? b.sub : null,
            pura: !conTexto,
          };
        }));
      }
    }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  // Scroll-based banner navigation
  const scrollToBanner = useCallback((idx: number, smooth = true) => {
    const slider = sliderRef.current;
    if (!slider) return;
    const w = slider.clientWidth;
    slider.scrollTo({ left: idx * w, behavior: smooth ? 'smooth' : 'instant' as ScrollBehavior });
    bannerIdxRef.current = idx;
    setBannerIdx(idx);
  }, []);

  // Auto-advance every 4s
  useEffect(() => {
    if (bannerCount === 0) return;
    const id = setInterval(() => {
      const next = (bannerIdxRef.current + 1) % bannerCount;
      scrollToBanner(next);
    }, 4000);
    return () => clearInterval(id);
  }, [scrollToBanner, bannerCount]);

  // Swipe support
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;
    let startX = 0;
    const onTouchStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const onTouchEnd   = (e: TouchEvent) => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) {
        const next = Math.max(0, Math.min(bannerCount - 1, bannerIdxRef.current + (diff > 0 ? 1 : -1)));
        scrollToBanner(next);
      }
    };
    slider.addEventListener('touchstart', onTouchStart, { passive: true });
    slider.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      slider.removeEventListener('touchstart', onTouchStart);
      slider.removeEventListener('touchend',   onTouchEnd);
    };
  }, [scrollToBanner, bannerCount]);

  // Track scroll position to update active dot
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const w = slider.clientWidth;
        if (w === 0) { ticking = false; return; }
        const idx = Math.round(slider.scrollLeft / w);
        if (idx !== bannerIdxRef.current) {
          bannerIdxRef.current = idx;
          setBannerIdx(idx);
        }
        ticking = false;
      });
    };
    slider.addEventListener('scroll', onScroll, { passive: true });
    return () => slider.removeEventListener('scroll', onScroll);
  }, [bannerCount]);

  if (banners.length === 0) return null;

  return (
    <div className="max-w-[1440px] mx-auto w-full lg:px-6 mt-4">
      <section className="w-screen mx-[calc(50%-50vw)] px-container-margin lg:w-auto lg:mx-0 lg:px-0">
        {/* Scroll-snap slider — clientWidth based, no clone tricks */}
        <div className="relative rounded-xl overflow-hidden">
          <div
            ref={sliderRef}
            className="flex overflow-x-auto hide-scrollbar"
            style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
          >
            {banners.map((b) => {
              // Ancla nativa (no Link de Next) a propósito: el destino puede ser una ruta interna o una url
              // externa, cargada libremente desde superadmin.
              const Slide = (b.link ? 'a' : 'div') as any;
              const slideProps = b.link ? { href: b.link } : {};
              return (
                <Slide
                  key={b.id}
                  {...slideProps}
                  className="relative aspect-[16/9] sm:aspect-[21/9] lg:aspect-auto lg:h-[300px] overflow-hidden shadow-sm shrink-0 group w-full block"
                  style={{ scrollSnapAlign: 'start', flex: '0 0 100%' }}
                >
                  {b.pura ? (
                    <>
                      {/* Imagen ya armada (flyer de Canva, etc.): se ve completa, sin recortar al ratio del
                          banner. El fondo borroso rellena los espacios en vez de dejar barras negras. */}
                      <img alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60" src={b.img} />
                      <img alt="" className="absolute inset-0 w-full h-full object-contain" src={b.img} />
                    </>
                  ) : (
                    <img alt="" className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" src={b.img} />
                  )}
                  <BannerOverlay style={bannerStyle} tag={b.tag} title1={b.title1} title2={b.title2} sub={b.sub} />
                </Slide>
              );
            })}
          </div>

          {/* Flechas para cambiar de banner — abajo a la derecha, fuera del texto. */}
          <div className="absolute bottom-3 right-3 flex gap-1.5 z-20">
            <button
              type="button"
              aria-label="Banner anterior"
              onClick={() => scrollToBanner((bannerIdxRef.current - 1 + bannerCount) % bannerCount)}
              className="flex w-8 h-8 rounded-full bg-white/90 items-center justify-center shadow-md active:scale-90 transition-transform"
            >
              <span className="material-symbols-outlined text-[18px] text-on-surface">chevron_left</span>
            </button>
            <button
              type="button"
              aria-label="Banner siguiente"
              onClick={() => scrollToBanner((bannerIdxRef.current + 1) % bannerCount)}
              className="flex w-8 h-8 rounded-full bg-white/90 items-center justify-center shadow-md active:scale-90 transition-transform"
            >
              <span className="material-symbols-outlined text-[18px] text-on-surface">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="flex justify-center gap-1.5 mt-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToBanner(i)}
              className={`rounded-full transition-all duration-300 ${
                bannerIdx === i ? 'w-4 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-surface-container-highest'
              }`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
