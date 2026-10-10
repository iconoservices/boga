'use client';

// Tarjeta de una plantilla en la ficha de un producto (/productos/<slug>). Al tocarla pregunta si quiere verla con su
// propio logo y nombre (opcional) antes de abrir la vista previa. El logo no se sube: se achica y se deja en su navegador.

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CLAVE_PREVIEW_MI_TIENDA } from '@/components/PreviewConLogo';

// Achica la imagen (lado mayor `max` px) y la deja como data URL: PNG para el logo (conserva la transparencia) y JPEG para
// el banner (pesa mucho menos); así cabe de sobra en sessionStorage.
function imagenADataUrl(file: File, max: number, tipo: 'image/png' | 'image/jpeg'): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * k));
      c.height = Math.max(1, Math.round(img.height * k));
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL(tipo, 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagen no válida')); };
    img.src = url;
  });
}

export default function TarjetaPlantilla({ id, name, category, heroImage, heroAlt }: { id: string; name: string; category: string; heroImage: string; heroAlt: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const inputLogo = useRef<HTMLInputElement>(null);
  const inputBanner = useRef<HTMLInputElement>(null);

  const elegir = async (f: File | undefined, cual: 'logo' | 'banner') => {
    if (!f) return;
    setError('');
    try {
      if (cual === 'logo') setLogo(await imagenADataUrl(f, 400, 'image/png'));
      else setBanner(await imagenADataUrl(f, 1400, 'image/jpeg'));
    } catch { setError('No pudimos leer esa imagen. Prueba con otra (PNG o JPG).'); }
  };

  // Logo y nombre son obligatorios (sin ellos no se abre la vista previa); el banner es opcional pero recomendado.
  const listo = !!logo && nombre.trim().length > 0;
  const verMiTienda = () => {
    if (!listo) { setError('Sube tu logo y escribe el nombre de tu negocio para ver cómo se vería tu tienda.'); return; }
    try { sessionStorage.setItem(CLAVE_PREVIEW_MI_TIENDA, JSON.stringify({ logo, nombre: nombre.trim(), banner })); } catch { setError('No pudimos guardar las imágenes. Prueba con unas más livianas.'); return; }
    router.push(`/preview/${id}?mi=1`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="group text-left bg-surface-container-lowest border border-surface-container-highest rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-surface-container-high">
          <img src={heroImage} alt={heroAlt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-on-background text-xs font-extrabold px-4 py-2 rounded-full">Ver vista previa</span>
          </div>
        </div>
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-headline-sm text-headline-sm text-on-background truncate">{name}</h3>
            <p className="text-secondary text-xs">{category}</p>
          </div>
          <span className="material-symbols-outlined text-primary shrink-0 group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
        </div>
      </button>

      {abierto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => setAbierto(false)} role="dialog" aria-modal="true" aria-label="Ver la plantilla con tu logo">
          <div className="w-full sm:max-w-md bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-on-background">¿Cómo se vería tu tienda?</h2>
                <p className="text-sm text-secondary mt-1">Sube tu logo y el nombre de tu negocio, y mira «{name}» con tus colores. Es solo una prueba: tus imágenes no se guardan en ningún lado.</p>
              </div>
              <button type="button" aria-label="Cerrar" onClick={() => setAbierto(false)} className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-secondary hover:bg-surface-container-high">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Logo (obligatorio) */}
            <button
              type="button"
              onClick={() => inputLogo.current?.click()}
              className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-surface-container-highest hover:border-primary p-4 text-left transition-colors"
            >
              <span className="w-14 h-14 rounded-xl bg-surface-container-high flex items-center justify-center overflow-hidden shrink-0">
                {logo ? <img src={logo} alt="Tu logo" className="w-full h-full object-contain" /> : <span className="material-symbols-outlined text-secondary text-[28px]">add_photo_alternate</span>}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-on-background">{logo ? 'Cambiar logo' : 'Subir mi logo'}</span>
                <span className="block text-[11px] font-semibold text-primary">Obligatorio</span>
              </span>
            </button>
            <input ref={inputLogo} type="file" accept="image/*" className="hidden" onChange={(e) => { elegir(e.target.files?.[0], 'logo'); e.target.value = ''; }} />

            {/* Nombre (obligatorio) */}
            <div>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={40}
                placeholder="Nombre de tu negocio"
                className="w-full px-4 py-3 rounded-xl border border-surface-container-highest bg-white text-sm font-semibold outline-none focus:border-primary"
              />
              <span className="block text-[11px] font-semibold text-primary mt-1 px-1">Obligatorio</span>
            </div>

            {/* Banner (opcional, recomendado): si no lo sube, la portada usa su logo */}
            <button
              type="button"
              onClick={() => inputBanner.current?.click()}
              className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-surface-container-highest hover:border-primary p-4 text-left transition-colors"
            >
              <span className="w-20 h-14 rounded-xl bg-surface-container-high flex items-center justify-center overflow-hidden shrink-0">
                {banner ? <img src={banner} alt="Tu banner" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-secondary text-[28px]">panorama</span>}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-on-background">{banner ? 'Cambiar banner' : 'Subir mi banner'}</span>
                <span className="block text-[11px] font-semibold text-secondary">Opcional, pero recomendado: si no lo subes, la portada usa tu logo.</span>
              </span>
            </button>
            <input ref={inputBanner} type="file" accept="image/*" className="hidden" onChange={(e) => { elegir(e.target.files?.[0], 'banner'); e.target.value = ''; }} />

            {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

            <div className="flex flex-col sm:flex-row gap-2 mt-1">
              <button
                type="button"
                onClick={verMiTienda}
                disabled={!listo}
                className="flex-1 bg-primary text-on-primary font-bold text-sm px-5 py-3 rounded-full transition-opacity disabled:opacity-40 active:scale-95"
              >
                Ver mi tienda
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
