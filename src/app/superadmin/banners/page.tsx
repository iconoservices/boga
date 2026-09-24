'use client';

// Extraído del page.tsx gigante de /superadmin (era la pestaña `personalizacion`): banners de los
// carruseles de portada (/market, Inicio y la foto de /negocios). Son del sitio entero, no de una tienda.

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { uploadFile } from '@/lib/uploadClient';
import { useEsSuperadmin } from '@/lib/superadmin';
import SuperadminSubheader from '@/components/SuperadminSubheader';
import Toggle from '@/components/superadmin/Toggle';
import ImageUploadInput from '@/components/superadmin/ImageUploadInput';
import { useDemo } from '@/context/DemoContext';
import { useStoreSettings } from '@/context/StoreSettingsContext';

export default function BannersAdmin() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/superadmin/banners');
  }, [cargando, esSuperadmin, router]);

  const { isDemoVisible, toggleDemoProducts } = useDemo();
  const { getSettings, updateSetting } = useStoreSettings();

  // Del listado de tiendas solo hace falta nombre, slug y categorías (para los banners por sección).
  const [storeList, setStoreList] = useState<{ slug: string; name: string; categories: { name: string; href: string }[] }[]>([]);
  useEffect(() => {
    if (!esSuperadmin) return;
    supabase.from('stores').select('slug,name,categories').order('name', { ascending: true }).then(({ data }) =>
      setStoreList((data ?? []).map((s: any) => ({ slug: s.slug, name: s.name, categories: Array.isArray(s.categories) ? s.categories : [] }))));
  }, [esSuperadmin]);

  // ── Estado y acciones (idénticos a los que vivían en el dashboard) ──
  // Banners del carrusel de /market: antes vivian hardcodeados en el codigo
  // (BANNERS_RAW), ahora se editan aca y /market los lee de la tabla
  // market_banners (via el mismo endpoint cacheado /api/catalog).
  const [marketBanners, setMarketBanners] = useState<any[]>([]);
  const [isLoadingMarketBanners, setIsLoadingMarketBanners] = useState(true);
  // Que carrusel se esta editando: /market o el de Inicio "/". Misma tabla,
  // solo cambia el filtro y a que pagina se le asigna lo nuevo.
  const [bannerPageTab, setBannerPageTab] = useState<'market' | 'home' | 'negocios'>('market');
  const visibleMarketBanners = React.useMemo(
    () => marketBanners.filter(b => (b.page || 'market') === bannerPageTab),
    [marketBanners, bannerPageTab]
  );
  // Estilo visual de cada carrusel completo (no de cada banner): 'center'
  // (el look de siempre de /market) o 'bottom' (el look de siempre del
  // Inicio). Tabla banner_page_settings, una fila por pagina.
  const [bannerStyles, setBannerStyles] = useState<Record<string, 'center' | 'bottom'>>({ market: 'center', home: 'bottom' });
  const fetchBannerStyles = async () => {
    const { data } = await supabase.from('banner_page_settings').select('page,style');
    if (!data) return;
    setBannerStyles(prev => {
      const next = { ...prev };
      data.forEach((row: any) => { next[row.page] = row.style; });
      return next;
    });
  };
  // /api/catalog cachea hasta ~12 min (s-maxage=120 + stale-while-revalidate=600).
  // Sin esto, guardar/borrar/reordenar un banner (o cambiar el estilo) podia
  // tardar todo eso en verse reflejado en /market, /explore o el Inicio.
  const revalidarCatalogo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch('/api/revalidate-catalog', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
    } catch { /* no bloquea el guardado si esto falla */ }
  };

  const handleSetBannerStyle = async (style: 'center' | 'bottom') => {
    setBannerStyles(prev => ({ ...prev, [bannerPageTab]: style }));
    const { error } = await supabase.from('banner_page_settings').upsert({ page: bannerPageTab, style }, { onConflict: 'page' });
    if (error) { alert('No se pudo guardar el estilo: ' + error.message); return; }
    await revalidarCatalogo();
  };
  const [editingMarketBannerId, setEditingMarketBannerId] = useState<string | 'new' | null>(null);
  const [marketBannerForm, setMarketBannerForm] = useState({ tag: '', title1: '', title2: '', sub: '', link: '', active: true, showText: true });
  const [marketBannerImageFile, setMarketBannerImageFile] = useState<File | null>(null);
  const [marketBannerImagePreview, setMarketBannerImagePreview] = useState<string | null>(null);
  const [isSavingMarketBanner, setIsSavingMarketBanner] = useState(false);

  const fetchMarketBanners = async () => {
    setIsLoadingMarketBanners(true);
    const { data, error } = await supabase.from('market_banners').select('*').order('sort_order', { ascending: true });
    setIsLoadingMarketBanners(false);
    if (error) { console.error('Error cargando banners:', error); return; }
    setMarketBanners(data || []);
  };

  React.useEffect(() => { fetchMarketBanners(); fetchBannerStyles(); }, []);

  const handleOpenNewMarketBanner = () => {
    setEditingMarketBannerId('new');
    setMarketBannerForm({ tag: '', title1: '', title2: '', sub: '', link: '', active: true, showText: true });
    setMarketBannerImageFile(null);
    setMarketBannerImagePreview(null);
  };

  const handleOpenEditMarketBanner = (b: any) => {
    setEditingMarketBannerId(b.id);
    setMarketBannerForm({ tag: b.tag || '', title1: b.title1 || '', title2: b.title2 || '', sub: b.sub || '', link: b.link || '', active: b.active !== false, showText: b.show_text !== false });
    setMarketBannerImageFile(null);
    setMarketBannerImagePreview(b.image || null);
  };

  const handleSaveMarketBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    // El titulo es opcional a proposito: si la imagen ya trae el texto
    // dibujado (un flyer armado en Canva, etc.), forzar un titulo aca
    // terminaba dibujando el texto de la web ENCIMA del de la imagen,
    // pisados los dos.
    const isNew = editingMarketBannerId === 'new';
    const current = !isNew ? marketBanners.find(b => b.id === editingMarketBannerId) : null;
    if (!marketBannerImageFile && !current?.image) { alert('Falta la imagen del banner.'); return; }
    setIsSavingMarketBanner(true);
    try {
      let imageUrl = current?.image || '';
      if (marketBannerImageFile) {
        imageUrl = await uploadFile(marketBannerImageFile, 'store-assets/market-banners');
      }
      const payload = {
        image: imageUrl,
        tag: marketBannerForm.tag || null,
        title1: marketBannerForm.title1.trim(),
        title2: marketBannerForm.title2 || null,
        sub: marketBannerForm.sub || null,
        link: marketBannerForm.link || null,
        active: marketBannerForm.active,
        show_text: marketBannerForm.showText,
      };
      const fullPayload: Record<string, any> = isNew
        ? { ...payload, sort_order: visibleMarketBanners.reduce((max, b) => Math.max(max, b.sort_order || 0), 0) + 1, page: bannerPageTab }
        : payload;

      const escribir = () =>
        isNew
          ? supabase.from('market_banners').insert([fullPayload])
          : supabase.from('market_banners').update(fullPayload).eq('id', editingMarketBannerId);

      let { error } = await escribir();

      // Mismo problema de siempre: si `show_text` o `page` todavia no existen
      // en la base (falta correr la migracion), reintenta sin esa columna en
      // vez de que el banner entero no se pueda guardar.
      const columnasOpcionales = ['show_text', 'page'];
      const columnasFaltantes: string[] = [];
      let faltante = columnasOpcionales.find((col) => col in fullPayload && new RegExp(col).test(error?.message || ''));
      while (error && faltante) {
        delete fullPayload[faltante];
        columnasFaltantes.push(faltante);
        ({ error } = await escribir());
        faltante = columnasOpcionales.find((col) => col in fullPayload && new RegExp(col).test(error?.message || ''));
      }
      if (!error && columnasFaltantes.length) {
        alert(`Banner guardado, pero faltó correr una migración pendiente en Supabase para: ${columnasFaltantes.join(', ')}.`);
      }
      if (error) throw error;

      setEditingMarketBannerId(null);
      await fetchMarketBanners();
      await revalidarCatalogo();
    } catch (err: any) {
      alert('No se pudo guardar el banner: ' + err.message);
    } finally {
      setIsSavingMarketBanner(false);
    }
  };

  const handleDeleteMarketBanner = async (id: string) => {
    if (!confirm('¿Eliminar este banner?')) return;
    const { error } = await supabase.from('market_banners').delete().eq('id', id);
    if (error) { alert('No se pudo eliminar: ' + error.message); return; }
    setMarketBanners(prev => prev.filter(b => b.id !== id));
    await revalidarCatalogo();
  };

  const handleMoveMarketBanner = async (id: string, direction: -1 | 1) => {
    const idx = visibleMarketBanners.findIndex(b => b.id === id);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= visibleMarketBanners.length) return;
    const a = visibleMarketBanners[idx];
    const b = visibleMarketBanners[swapIdx];
    setMarketBanners(prev => prev.map(x => {
      if (x.id === a.id) return { ...x, sort_order: b.sort_order };
      if (x.id === b.id) return { ...x, sort_order: a.sort_order };
      return x;
    }));
    await Promise.all([
      supabase.from('market_banners').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('market_banners').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
    await revalidarCatalogo();
  };

  if (!esSuperadmin) return null;

  return (
    <div className="min-h-screen bg-[#f9f9ff]">
      <SuperadminSubheader title="Banners de portada" icon="view_carousel" />
      <main className="max-w-[900px] mx-auto px-4 py-8">
            <div className="space-y-6 animate-fade-in">
              {/* Banners de los carruseles de portada — no son de una tienda puntual, son del sitio entero */}
              <div className="bg-white rounded-md border border-[#c2c6d6] overflow-hidden shadow-sm">
                <div className="p-5 border-b border-[#c2c6d6] flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-[#191b23]">Banners de Portada</h2>
                    <p className="text-[11px] text-[#424754] mt-0.5">Los carruseles de /market y del Inicio — son del sitio entero, no de una tienda.</p>
                  </div>
                  <button
                    onClick={handleOpenNewMarketBanner}
                    className="px-3 py-2 bg-[#0058be] text-white rounded-md font-bold text-xs hover:bg-[#004395] transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Nuevo Banner
                  </button>
                </div>

                <div className="px-5 pt-3 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex gap-1.5">
                    {([['market', 'Market'], ['home', 'Inicio'], ['negocios', 'Foto de /negocios']] as const).map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => setBannerPageTab(id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                          bannerPageTab === id ? 'bg-[#0058be] text-white' : 'bg-[#f2f3fd] text-[#545f73] hover:bg-[#e6e7f2]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#727785] uppercase tracking-wide">Estilo del carrusel:</span>
                    <div className="flex gap-1 bg-[#f2f3fd] p-0.5 rounded-full">
                      {([['center', 'Centrado'], ['bottom', 'Abajo']] as const).map(([id, label]) => (
                        <button
                          key={id}
                          onClick={() => handleSetBannerStyle(id)}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                            (bannerStyles[bannerPageTab] || 'center') === id ? 'bg-white text-[#0058be] shadow-sm' : 'text-[#727785] hover:text-[#424754]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="px-5 pb-1 text-[10px] text-[#727785] font-semibold">
                  Afecta a TODOS los banners de {{ market: '/market', home: 'el Inicio', negocios: 'la portada de /negocios (se usa la primera foto activa)' }[bannerPageTab]}, no solo al que estés editando.
                </p>

                <div className="p-4">
                  {editingMarketBannerId && (
                    <form onSubmit={handleSaveMarketBanner} className="mb-4 p-4 bg-[#f2f3fd]/40 rounded-lg border border-[#c2c6d6] space-y-3">
                      <p className="text-[10px] font-black text-[#424754] uppercase tracking-widest">
                        {editingMarketBannerId === 'new' ? 'Nuevo banner' : 'Editar banner'}
                      </p>
                      <p className="text-[10px] text-[#727785] font-semibold -mt-1.5">
                        Si tu imagen ya tiene el texto dibujado (un flyer armado en Canva u otra herramienta), dejá el tag y los títulos vacíos — si los llenás, la web dibuja ese texto ENCIMA del de tu imagen y se pisan.
                      </p>
                      <div className="flex gap-3">
                        <label className="shrink-0 w-20 h-14 rounded-lg border-2 border-dashed border-[#c2c6d6] flex items-center justify-center cursor-pointer hover:bg-white transition-colors overflow-hidden bg-white">
                          {marketBannerImagePreview ? (
                            <img src={marketBannerImagePreview} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-[#727785] text-[20px]">add_a_photo</span>
                          )}
                          <input
                            type="file" accept="image/*" className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setMarketBannerImageFile(file);
                              setMarketBannerImagePreview(URL.createObjectURL(file));
                            }}
                          />
                        </label>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input
                            type="text" placeholder="Tag (opcional, ej: Promo Exclusiva)"
                            value={marketBannerForm.tag}
                            onChange={(e) => setMarketBannerForm(prev => ({ ...prev, tag: e.target.value }))}
                            className="col-span-2 bg-white border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be]"
                          />
                          <input
                            type="text" placeholder="Título línea 1 (ej: 2X1 EN) — opcional"
                            value={marketBannerForm.title1}
                            onChange={(e) => setMarketBannerForm(prev => ({ ...prev, title1: e.target.value }))}
                            className="bg-white border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be]"
                          />
                          <input
                            type="text" placeholder="Título línea 2 (ej: HAMBURGUESAS)"
                            value={marketBannerForm.title2}
                            onChange={(e) => setMarketBannerForm(prev => ({ ...prev, title2: e.target.value }))}
                            className="bg-white border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-bold text-[#191b23] outline-none focus:border-[#0058be]"
                          />
                        </div>
                      </div>
                      <input
                        type="text" placeholder="Descripción corta (ej: Solo por hoy en locales seleccionados)"
                        value={marketBannerForm.sub}
                        onChange={(e) => setMarketBannerForm(prev => ({ ...prev, sub: e.target.value }))}
                        className="w-full bg-white border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-medium text-[#191b23] outline-none focus:border-[#0058be]"
                      />
                      <input
                        type="text" placeholder="Link opcional al tocarlo (ej: /promotions o una url)"
                        value={marketBannerForm.link}
                        onChange={(e) => setMarketBannerForm(prev => ({ ...prev, link: e.target.value }))}
                        className="w-full bg-white border border-[#ecedf7] rounded-md px-3 py-2 text-xs font-medium text-[#191b23] outline-none focus:border-[#0058be]"
                      />
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-[11px] font-bold text-[#424754] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={marketBannerForm.active}
                              onChange={(e) => setMarketBannerForm(prev => ({ ...prev, active: e.target.checked }))}
                              className="w-4 h-4 accent-[#0058be]"
                            />
                            Visible en {{ market: '/market', home: 'el Inicio', negocios: 'la portada de /negocios (se usa la primera foto activa)' }[bannerPageTab]}
                          </label>
                          <label className="flex items-center gap-2 text-[11px] font-bold text-[#424754] cursor-pointer" title="Desmarcá esto si tu imagen ya trae el texto dibujado — el tag/título/descripción quedan guardados pero no se dibujan encima.">
                            <input
                              type="checkbox"
                              checked={marketBannerForm.showText}
                              onChange={(e) => setMarketBannerForm(prev => ({ ...prev, showText: e.target.checked }))}
                              className="w-4 h-4 accent-[#0058be]"
                            />
                            Mostrar texto encima
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setEditingMarketBannerId(null)} className="px-3 py-2 rounded-md font-bold text-xs text-[#424754] hover:bg-[#e6e7f2] transition-colors">
                            Cancelar
                          </button>
                          <button type="submit" disabled={isSavingMarketBanner} className="px-4 py-2 bg-[#0058be] text-white rounded-md font-bold text-xs hover:bg-[#004395] transition-colors disabled:opacity-50">
                            {isSavingMarketBanner ? 'Guardando…' : 'Guardar'}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {isLoadingMarketBanners ? (
                    <p className="text-xs text-[#727785] italic py-3 text-center">Cargando…</p>
                  ) : visibleMarketBanners.length === 0 ? (
                    <p className="text-xs text-[#727785] italic py-3 text-center">
                      Sin banners cargados para {{ market: '/market', home: 'el Inicio', negocios: 'la portada de /negocios (se usa la primera foto activa)' }[bannerPageTab]} — muestra los de ejemplo por defecto.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {visibleMarketBanners.map((b, idx) => (
                        <div key={b.id} className="flex items-center gap-3 p-2 rounded-lg border border-[#ecedf7]">
                          <img src={b.image} alt="" className="w-16 h-9 rounded-md object-cover shrink-0 bg-[#e6e7f2]" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-[#191b23] truncate">
                              {b.title1} {b.title2}
                              {!b.active && <span className="ml-2 text-[9px] font-bold text-amber-600 uppercase">Oculto</span>}
                            </p>
                            <p className="text-[10px] text-[#727785] truncate">{b.sub}{b.link ? ` · → ${b.link}` : ''}</p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button onClick={() => handleMoveMarketBanner(b.id, -1)} disabled={idx === 0} className="material-symbols-outlined text-[16px] text-[#727785] hover:text-[#0058be] p-1 hover:bg-[#e6e7f2] rounded disabled:opacity-30 disabled:pointer-events-none">arrow_upward</button>
                            <button onClick={() => handleMoveMarketBanner(b.id, 1)} disabled={idx === visibleMarketBanners.length - 1} className="material-symbols-outlined text-[16px] text-[#727785] hover:text-[#0058be] p-1 hover:bg-[#e6e7f2] rounded disabled:opacity-30 disabled:pointer-events-none">arrow_downward</button>
                            <button onClick={() => handleOpenEditMarketBanner(b)} className="material-symbols-outlined text-[16px] text-[#727785] hover:text-[#0058be] p-1 hover:bg-[#e6e7f2] rounded">edit</button>
                            <button onClick={() => handleDeleteMarketBanner(b.id)} className="material-symbols-outlined text-[16px] text-[#727785] hover:text-red-600 p-1 hover:bg-red-50 rounded">delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-b border-[#c2c6d6] pb-4">
                <h2 className="text-xl font-bold text-[#191b23]">Personalización de Tiendas</h2>
                <p className="text-xs text-[#424754] mt-1">Ajusta la apariencia visual, banners promocionales y contenido demostrativo de cada comercio.</p>
              </div>

              <div className="bg-white rounded-md border border-[#c2c6d6] overflow-hidden divide-y divide-[#ecedf7] shadow-sm">
                {storeList.map((store) => {
                  const settings = getSettings(store.slug);
                  const demoOn = isDemoVisible(store.slug);
                  return (
                    <div key={store.slug} className="p-5 flex flex-col lg:flex-row gap-6 lg:items-start justify-between hover:bg-[#f2f3fd]/10 transition-colors">
                      <div className="min-w-0 lg:w-1/3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs text-[#191b23]">{store.name}</span>
                          <span className="text-[9px] font-bold text-[#424754] bg-[#ecedf7] px-2 py-0.5 rounded-full border border-[#c2c6d6]">/{store.slug}</span>
                        </div>
                        <p className="text-[11px] text-[#424754] font-medium leading-relaxed">
                          Define el comportamiento de visualización del catálogo e imágenes para la tienda en su sitio independiente.
                        </p>
                      </div>

                      <div className="flex-1 flex flex-col gap-4">
                        {/* Option toggles */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 bg-[#f2f3fd]/35 p-4 rounded-md border border-[#c2c6d6]/60">
                          {[
                            { label: 'Productos Demo',   on: demoOn,                          toggle: () => toggleDemoProducts(store.slug) },
                            { label: 'Fotos Productos',  on: settings.showProductImages,       toggle: () => updateSetting(store.slug, 'showProductImages', !settings.showProductImages) },
                            { label: 'Splash Inicial',    on: settings.showSplash,             toggle: () => updateSetting(store.slug, 'showSplash', !settings.showSplash) },
                            { label: 'Imagen Splash',    on: settings.showHeroImage,          toggle: () => updateSetting(store.slug, 'showHeroImage', !settings.showHeroImage), disabled: !settings.showSplash },
                            { label: 'Auto-Banner Cat',  on: settings.useCategoryFeaturedImage, toggle: () => updateSetting(store.slug, 'useCategoryFeaturedImage', !settings.useCategoryFeaturedImage) },
                          ].map(item => (
                            <div key={item.label} className={`flex items-center justify-between gap-3 ${item.disabled ? 'opacity-40 pointer-events-none' : ''}`}>
                              <span className="text-[11px] font-bold text-[#424754]">{item.label}</span>
                              <Toggle on={item.on} onChange={item.toggle} />
                            </div>
                          ))}
                        </div>

                        {/* Manual Category Banners */}
                        {!settings.useCategoryFeaturedImage && (
                          <div className="bg-[#f2f3fd]/20 rounded-md p-4 border border-[#c2c6d6] space-y-4">
                            <div className="border-b border-[#c2c6d6] pb-2 flex justify-between items-center">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#424754]">Banners Promocionales por Sección</span>
                              <span className="text-[9px] font-bold text-[#0058be] bg-[#d8e2ff] px-2 py-0.5 rounded">Manuales</span>
                            </div>
                            
                            {[{ href: 'all', name: 'Todas las secciones' }, ...store.categories].map(cat => (
                              <div key={cat.href} className="bg-white rounded-md p-3 border border-[#c2c6d6] space-y-2.5 shadow-sm">
                                <p className="text-[10px] font-extrabold text-[#0058be] uppercase tracking-wide">{cat.name}</p>
                                <ImageUploadInput
                                  value={settings.categoryBannerUrls[cat.href] || ''}
                                  onChange={(url) => updateSetting(store.slug, 'categoryBannerUrls', { ...settings.categoryBannerUrls, [cat.href]: url })}
                                  placeholder="Imagen de banner (URL)..."
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <div className="sm:col-span-2">
                                    <input
                                      type="text"
                                      placeholder="Título del banner..."
                                      value={settings.categoryBannerTitles[cat.href] || ''}
                                      onChange={(e) => updateSetting(store.slug, 'categoryBannerTitles', { ...settings.categoryBannerTitles, [cat.href]: e.target.value })}
                                      className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-2.5 py-1.5 text-xs text-[#191b23] outline-none focus:border-[#0058be] transition-colors"
                                    />
                                  </div>
                                  <div>
                                    <input
                                      type="text"
                                      placeholder="Precio destacado..."
                                      value={settings.categoryBannerPrices[cat.href] || ''}
                                      onChange={(e) => updateSetting(store.slug, 'categoryBannerPrices', { ...settings.categoryBannerPrices, [cat.href]: e.target.value })}
                                      className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-2.5 py-1.5 text-xs text-[#191b23] outline-none focus:border-[#0058be] transition-colors"
                                    />
                                  </div>
                                  <div className="sm:col-span-3">
                                    <input
                                      type="text"
                                      placeholder="Descripción promocional..."
                                      value={settings.categoryBannerDescs[cat.href] || ''}
                                      onChange={(e) => updateSetting(store.slug, 'categoryBannerDescs', { ...settings.categoryBannerDescs, [cat.href]: e.target.value })}
                                      className="w-full bg-[#f9f9ff] border border-[#c2c6d6] rounded-lg px-2.5 py-1.5 text-xs text-[#191b23] outline-none focus:border-[#0058be] transition-colors"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Splash hero URL */}
                        <div className={`transition-opacity ${(!settings.showSplash || !settings.showHeroImage) ? 'opacity-30 pointer-events-none' : ''}`}>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[#424754] mb-1.5 block">Imagen Splash de Bienvenida</label>
                          <ImageUploadInput
                            value={settings.customHeroUrl}
                            onChange={(url) => updateSetting(store.slug, 'customHeroUrl', url)}
                            placeholder="Predeterminada del sistema (dejar en blanco)..."
                          />
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
      </main>
    </div>
  );
}
