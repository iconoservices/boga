'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { StoreConfig } from '@/lib/stores.config';
import { supabase } from '@/lib/supabase';
import { useDemo } from '@/context/DemoContext';
import { useStoreSettings } from '@/context/StoreSettingsContext';

interface SunsetTemplateProps {
  store: StoreConfig;
}

const MENU_ITEMS = [
  {
    id: 'wagyu-sliders',
    name: 'Signature Wagyu Sliders',
    desc: 'Carne añejada, alioli de trufa, chalotas caramelizadas, brioche artesanal.',
    price: 'S/ 48.00',
    category: 'kitchen',
    subcategory: 'Entradas',
    featured: true,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCbJJZYwNiSClIbig2psEnPX-Mdo5zKxDM6gr3F7yIqILH53pI8HkJjGqaaQJwHPYepFv7xcr_ZlReJe9dwct1RVSfeRxx7VA3sXbGlJ5wdXNMiUFSEkEyY3b7CMmUXRwA-SU5-CpJpW76lh2xqzWI1-vUtqCaL72Z7asOnNwWToiiiEOaRbD_t5HjlZapKUUw2f05U3kUBJzRCbUV01JH8Db86RO2hXjLsftEL-DcMf2gMC5n9qTXtBnvOb9VZDIL4S5i5yqpbspLx',
  },
  {
    id: 'midnight-gold',
    name: 'Midnight Gold',
    desc: 'Bourbon de roble carbonizado, cereza negra, láminas de oro de 24k.',
    price: 'S/ 89.00',
    category: 'bar',
    subcategory: '',
    featured: false,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAgStS4B2-hohIitIA7tQZSDBmq2em-1XrGS3uBUmz5FfZZaBwe594reCCPglUwvZGkcGxCCZ4jLJ4M_SKb0kmGRq0BLur2ULs2Qg99NiwLhQPW5oJOPRoFOPwVPBV9yOIfQOjV-Awni3yAkHlucBAQfXhhzGjxyeC9fCkCgoTsPpEHsj6OpQ8aPBRpO6g1fNH3RzIJT5j72iqRvMeFKYEuxucJEIQwMxeo4fN09AI-hH1cjiGC-2yaDmEqjMaJDzb-BmxVS7-31N3S',
  },
  {
    id: 'ribeye',
    name: 'Sunset Ribeye',
    desc: 'Añejado por 35 días, mantequilla de tuétano y sal de mar ahumada.',
    price: 'S/ 95.00',
    category: 'kitchen',
    subcategory: 'Fondos',
    featured: false,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBAIiKdT7SYdiYPwO90-eL2k0sPpnMIspEgYCnjxhkhgu-tjX4DHZAlHuY0Gjc_yRzP3KiJccSXtAaoprfGrlwQDImUbN8LOb2wLBnpGYt7z70_R3pwc-LpqEoH0rMPy2M4N1Wnz6lilGGHIJY0F8NfklZsUCYKtaM145-1uPG_115ES5URGjqDkS7ROWC8PvvJ9RzQSqDIkwNlstPL9wymPHZNZEAotSy68xirS7a0gIKp0S3IaLBvf8oDBDVXVyhtUA0sjKHYsDyg',
  },
  {
    id: 'botanista',
    name: 'Reserva Botanista',
    desc: 'Infusión de pepino, vermut seco, bruma de saúco.',
    price: 'S/ 38.00',
    category: 'bar',
    subcategory: '',
    featured: false,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDOCxXYf-roj5G6XIUiqdm3HuHbve4LsnlmqM1SDL9AOVeFKIRKxlpsE1IunyBWd7UMELPYKevItVnBNggslOcBUGGIJ2WjkES2NO7DGvojK744Yhb2sHBD_Lp8XoT0J9mrrstCD3QHNeqmbsVb2AP0TW5GxAaPfduMAlPVVG4EX0gcMN07L7dKAibcDs46anw-u-98qcweoSNND72M2gyE4RMmXsztVIvwd3678SfA3XyOzLcIAUOS0ZX0zcThnpML5vPO83DglPV7',
  },
  {
    id: 'espresso',
    name: 'Espresso de Medianoche',
    desc: 'Arábica de origen único, crema aterciopelada, ralladura de naranja.',
    price: 'S/ 12.00',
    category: 'cafe',
    subcategory: '',
    featured: false,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBogKy7H8TKggn9u010VJgbuHQ2sJqxmwyMCuAXNEkLNOVMZ_is_I8lBB0lLH_H5ZKWJ2-OHRmvtGD0i0Uj_LjYeG7gRNDVg5i3YD7JiQlLMW3cX5CXKbHXZwY4r4PZm_QRQTfYVJMXCv_AX7UBMqDHcw0HCLrqP3lLKOKsZFnlnKqPexFpOOjBFsK2JBZH_4dh37JZKGqiC2DPY_-T12llYsZDJXU0N3M0NxYT3M5jKHNFVB4xnE55ILb6T0K5kFBXl5xKc',
  },
];

export default function SunsetTemplate({ store }: SunsetTemplateProps) {
  const [activeTab, setActiveTab] = useState('all');
  const [entered, setEntered] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<typeof MENU_ITEMS[0] | null>(null);
  const [products, setProducts] = useState<typeof MENU_ITEMS>(MENU_ITEMS);
  const { isDemoVisible } = useDemo();
  const { getSettings } = useStoreSettings();
  
  const demoOn = isDemoVisible(store.slug);
  const settings = getSettings(store.slug);
  const heroUrl = settings.customHeroUrl || store.heroImage;

  // Evita el flash de hidratación: no renderizamos nada hasta que
  // el contexto (StoreSettings) esté completamente cargado en el cliente
  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store', store.slug);
      
      if (data && !error) {
        const dbProducts = data.map((p) => {
          const categoryObj = store.categories.find(c => c.name === p.category);
          return {
            id: p.id,
            name: p.name,
            desc: p.description || '',
            price: `S/ ${p.price.toFixed(2)}`,
            category: categoryObj ? categoryObj.href : p.category.toLowerCase(),
            subcategory: p.subcategory || '',
            featured: false,
            image: p.image || '',
          };
        });
        
        // Merge DB products with MENU_ITEMS (DB products first)
        setProducts([...dbProducts, ...MENU_ITEMS]);
      }
    };
    
    fetchProducts();
  }, [store.slug, store.categories]);

  const t = store.theme;

  // Show demo items only if enabled from admin
  const visibleProducts = demoOn ? products : products.filter(p => !MENU_ITEMS.find(m => m.id === p.id));

  const filtered =
    activeTab === 'all' ? visibleProducts : visibleProducts.filter((m) => m.category === activeTab);
  const featured = filtered.find((m) => m.featured) ?? filtered[0];
  const rest = filtered; // Show all items in the list, featured included

  // Agrupar por subcategoría
  const groupedProducts = rest.reduce((acc, item) => {
    const sub = activeTab === 'all' ? 'Todos' : (item.subcategory || 'Otros');
    if (!acc[sub]) acc[sub] = [];
    acc[sub].push(item);
    return acc;
  }, {} as Record<string, typeof rest>);
  
  const subcategories = Object.keys(groupedProducts).sort((a, b) => {
    if (a === 'Otros') return 1;
    if (b === 'Otros') return -1;
    return a.localeCompare(b);
  });

  // ── Splash / Landing ──────────────────────────────────────────
  if (!isMounted) return <div style={{ background: t.background, minHeight: '100vh', width: '100%' }} />;

  return (
    <>
      {/* Background protector to prevent white flashes during hydration or transitions */}
      <div 
        style={{ 
          position: 'fixed', 
          inset: 0, 
          background: t.background, 
          zIndex: -1 
        }} 
      />

      {(!entered && settings.showSplash) ? (
        <main
          className="relative h-[100dvh] w-full flex items-center justify-center overflow-hidden"
          style={{ background: t.background, fontFamily: t.fontBody }}
        >
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700;1,400;1,700&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />

        {/* Backdrop */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 z-10"
            style={{
              background: `linear-gradient(to bottom, ${t.surfaceContainerLowest}66, ${t.surfaceContainerLowest}33, ${t.surfaceContainerLowest})`,
            }}
          />
          {settings.showHeroImage && (
            <img
              className="w-full h-full object-cover"
              style={{ filter: 'brightness(0.35) contrast(1.25)' }}
              alt={store.heroAlt}
              src={heroUrl}
            />
          )}
        </div>

        {/* Content */}
        <div
          className="relative z-20 flex flex-col items-center text-center px-6"
          style={{ animation: 'sunsetFadeIn 2.5s ease-out forwards' }}
        >
          <div
            className="mb-8 overflow-hidden rounded-2xl flex items-center justify-center border"
            style={{
              width: '80px',
              height: '80px',
              borderColor: `${t.outlineVariant}33`,
              background: `${t.surface}4D`,
              backdropFilter: 'blur(12px)',
            }}
          >
            {store.logoImage ? (
              <img src={store.logoImage} alt={store.name} className="w-full h-full object-cover" />
            ) : (
              <span
                className="material-symbols-outlined text-5xl"
                style={{ color: t.primary, fontVariationSettings: "'FILL' 1" }}
              >
                local_bar
              </span>
            )}
          </div>

          <h1
            className="text-5xl md:text-8xl tracking-tighter mb-2 uppercase italic"
            style={{
              fontFamily: t.fontHeadline,
              color: t.primary,
              textShadow: `0 0 20px ${t.primary}66`,
            }}
          >
            {store.name}
          </h1>
          <p
            className="uppercase tracking-[0.4em] text-sm mb-12"
            style={{ fontFamily: t.fontLabel, color: t.onSurfaceVariant, opacity: 0.8 }}
          >
            {store.tagline}
          </p>

          <button
            onClick={() => setEntered(true)}
            className="relative px-12 py-4 rounded-lg font-bold tracking-widest uppercase text-xs overflow-hidden transition-all duration-500 hover:scale-105 active:scale-95"
            style={{
              background: `linear-gradient(to right, ${t.primary}, ${t.secondaryContainer})`,
              color: t.onPrimary,
              fontFamily: t.fontLabel,
            }}
          >
            Ingresar al Lounge
          </button>
        </div>

        {/* Bottom accent */}
        <div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3 opacity-40"
          style={{ fontFamily: t.fontLabel }}
        >
          <span
            className="text-[10px] uppercase tracking-[0.2em]"
            style={{ color: t.onSurface }}
          >
            Excelencia Curada
          </span>
          <div
            className="w-[1px] h-12"
            style={{ background: `linear-gradient(to bottom, ${t.primary}99, transparent)` }}
          />
        </div>

        <style>{`
          @keyframes sunsetFadeIn {
            0% { opacity: 0; transform: scale(1.05); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </main>
    ) : (
      /* ── Menu / Catalog ───────────────────────────────────────────── */
      <div
        className="min-h-[100dvh]"
        style={{ background: t.background, color: t.onBackground, fontFamily: t.fontBody }}
      >
      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700;1,400;1,700&family=Manrope:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      {/* Top bar */}
      <header
        className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6"
        style={{
          background: `${t.background}E6`,
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${t.outlineVariant}26`,
        }}
      >
        <button
          onClick={() => setEntered(false)}
          className="flex items-center gap-3 transition-opacity hover:opacity-70"
          style={{ fontFamily: t.fontLabel, color: t.onSurfaceVariant }}
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          {store.logoImage && (
            <img src={store.logoImage} alt={store.name} className="w-8 h-8 rounded-lg object-cover border border-white/10" />
          )}
          <span
            className="text-xl font-bold tracking-tighter uppercase italic"
            style={{ fontFamily: t.fontHeadline, color: t.primary }}
          >
            {store.name}
          </span>
        </button>
        <Link
          href="/"
          className="flex items-center gap-1.5 transition-opacity hover:opacity-100 opacity-60 bg-white/5 px-3 py-1.5 rounded-full"
          style={{ fontFamily: t.fontLabel, color: t.onSurface, border: `1px solid ${t.outlineVariant}33` }}
        >
          <span className="material-symbols-outlined text-[14px]">explore</span>
          <span className="text-[9px] uppercase tracking-widest font-bold">Explorar</span>
        </Link>
      </header>

      <main className="pt-[72px] pb-32 px-6 max-w-5xl mx-auto">
        {/* Section header */}
        <header className="mb-6">
          <h2
            className="text-4xl md:text-6xl font-bold italic tracking-tight leading-none"
            style={{ fontFamily: t.fontHeadline, color: t.onSurface }}
          >
            Nuestra Selección
          </h2>
        </header>

        {/* Category tabs */}
        <div
          className="flex gap-8 mb-10 overflow-x-auto pb-4"
          style={{ borderBottom: `1px solid ${t.outlineVariant}26` }}
        >
          {[
            { id: 'all', label: 'Recomendados' },
            ...store.categories.map(cat => ({ id: cat.href, label: cat.name }))
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="text-xs uppercase tracking-widest pb-2 whitespace-nowrap transition-colors"
              style={{
                fontFamily: t.fontLabel,
                color: activeTab === tab.id ? t.primary : `${t.onSurfaceVariant}99`,
                borderBottom: activeTab === tab.id ? `1px solid ${t.primary}` : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Featured item */}
        {featured && (() => {
          const isManual = !settings.useCategoryFeaturedImage;
          const bannerImg   = isManual ? (settings.categoryBannerUrls[activeTab]   || null) : featured.image;
          const bannerName  = isManual ? (settings.categoryBannerTitles[activeTab]  || '')   : featured.name;
          const bannerDesc  = isManual ? (settings.categoryBannerDescs[activeTab]   || '')   : featured.desc;
          const bannerPrice = isManual ? (settings.categoryBannerPrices[activeTab]  || '')   : featured.price;

          // In manual mode with no image configured, skip rendering the featured block
          if (isManual && !bannerImg) return null;
          return (
          <div
            className="relative overflow-hidden mb-0 cursor-pointer group flex flex-col -mx-6 sm:mx-0 sm:rounded-xl"
            style={{ background: t.surfaceContainerLowest, borderBottom: `1px solid ${t.outlineVariant}1A`, borderTop: `1px solid ${t.outlineVariant}1A` }}
            onClick={() => setSelectedProduct(featured)}
          >
            <div className="w-full aspect-[2/1] sm:aspect-[21/7] overflow-hidden bg-black/5">
              <img
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                alt={bannerName}
                src={bannerImg!}
              />
            </div>
            
            {/* Text content below image */}
            <div className="px-6 py-5 md:p-6 w-full flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <h3
                  className="text-2xl md:text-3xl italic"
                  style={{ fontFamily: t.fontHeadline, color: t.onSurface }}
                >
                  {bannerName}
                </h3>
                <p
                  className="text-xs md:text-sm mt-1.5"
                  style={{ color: t.onSurfaceVariant }}
                >
                  {bannerDesc}
                </p>
              </div>
              <span
                className="font-bold text-base md:text-xl tracking-tighter shrink-0 pt-1"
                style={{ fontFamily: t.fontLabel, color: t.primary }}
              >
                {bannerPrice}
              </span>
            </div>
          </div>
          );
        })()}

        {activeTab !== 'all' && subcategories.filter(s => s !== 'Otros' && s !== 'Todos').length > 0 && (
          <div className="sticky top-0 z-40 w-full overflow-x-auto no-scrollbar border-b border-white/5 bg-opacity-90 backdrop-blur-md" style={{ background: `${t.background}E6` }}>
            <div className="flex px-4 py-2 gap-2 min-w-max">
              {subcategories.filter(s => s !== 'Todos').map(sub => (
                <button
                  key={sub}
                  onClick={() => {
                    const el = document.getElementById(`section-${sub}`);
                    if (el) {
                      const y = el.getBoundingClientRect().top + window.scrollY - 80;
                      window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                  }}
                  className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all hover:bg-white/10"
                  style={{ 
                    fontFamily: t.fontLabel,
                    color: t.onSurface,
                    border: `1px solid ${t.outlineVariant}33`
                  }}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rest of items — grouped list style */}
        <div className="space-y-4 pt-2 pb-12">
          {subcategories.map((sub) => (
            <div key={sub} id={`section-${sub}`}>
              {/* Solo mostrar el título si no es "Otros" ni "Todos" */}
              {(sub !== 'Otros' && sub !== 'Todos' && subcategories.length > 1) && (
                <h2 
                  className="px-4 py-2 text-sm font-bold tracking-widest uppercase mb-2"
                  style={{ fontFamily: t.fontLabel, color: t.primary, opacity: 0.9 }}
                >
                  {sub}
                </h2>
              )}
              
              <div className="space-y-1">
                {groupedProducts[sub].map((item) => (
                  <div
                    key={item.id}
                    className="group relative py-4 px-4 flex justify-between items-center cursor-pointer rounded-lg transition-all duration-300"
                    style={{ borderBottom: `1px solid ${t.outlineVariant}1A` }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = t.surfaceContainer)
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => setSelectedProduct(item)}
                  >
                    <div className="z-10 flex items-center gap-4">
                      {settings.showProductImages && item.image && (
                        <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0">
                          <img className="w-full h-full object-cover" alt={item.name} src={item.image} />
                        </div>
                      )}
                      <div>
                        <h3
                          className="text-lg italic"
                          style={{ fontFamily: t.fontHeadline, color: t.onSurface }}
                        >
                          {item.name}
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: t.onSurfaceVariant }}>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    <span
                      className="z-10 ml-4 shrink-0 font-bold text-sm"
                      style={{ fontFamily: t.fontLabel, color: t.primary }}
                    >
                      {item.price}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-0 w-full z-50 h-[84px] pb-2 flex justify-center"
        style={{
          background: `${t.background}E6`,
          backdropFilter: 'blur(20px)',
          borderTop: `1px solid ${t.outlineVariant}26`,
          boxShadow: `0 -4px 40px ${t.primary}14`,
        }}
      >
        <div className="flex justify-center items-center gap-6 md:gap-10 w-full max-w-md h-full px-4">
          {store.categories.map((cat) => {
            const isActive = activeTab === cat.href;
            return (
              <button
                key={cat.href}
                onClick={() => setActiveTab(cat.href)}
                className="relative flex flex-col items-center justify-center transition-all duration-500 h-full w-[72px] shrink-0"
                style={{
                  color: isActive ? t.primary : `${t.onSurface}80`,
                  fontFamily: t.fontLabel,
                }}
              >
                {/* Active Indicator Background */}
                <div 
                  className={`absolute flex items-center justify-center transition-all duration-500 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
                  style={{ top: '8px' }}
                >
                  <div className="w-[52px] h-[52px] rounded-full" style={{ background: `${t.primary}1A` }}></div>
                </div>

                <span
                  className="material-symbols-outlined relative z-10 transition-all duration-500"
                  style={{ 
                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                    fontSize: isActive ? '24px' : '22px',
                    transform: isActive ? 'translateY(-6px)' : 'translateY(2px)',
                  }}
                >
                  {cat.icon}
                </span>
                
                <span 
                  className={`absolute uppercase tracking-[0.1em] text-[9px] font-bold transition-all duration-500 ${
                    isActive ? 'opacity-100 bottom-1' : 'opacity-0 -bottom-2'
                  }`}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Product Full Screen View */}
      {selectedProduct && (
        <div 
          className="fixed inset-0 z-[100] flex flex-col md:flex-row w-[100vw] h-[100dvh] overflow-hidden"
          style={{ 
            background: t.background, 
            animation: 'sunsetFadeIn 0.4s ease-out forwards'
          }}
        >
          {/* Back/Close button */}
          <button 
            onClick={() => setSelectedProduct(null)}
            className="absolute top-6 left-6 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-90 hover:bg-black/20"
            style={{ 
              background: `${t.surface}4D`, 
              backdropFilter: 'blur(12px)', 
              color: t.onSurface,
              border: `1px solid ${t.outlineVariant}33`
            }}
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>

          {/* Image Section */}
          <div className="relative w-[100vw] md:w-[50vw] h-[45vh] md:h-full shrink-0">
            <img className="w-full h-full object-cover" alt={selectedProduct.name} src={selectedProduct.image} />
            <div 
              className="absolute inset-0 block md:hidden" 
              style={{ background: `linear-gradient(to top, ${t.background}, transparent 60%)` }}
            />
            <div 
              className="absolute inset-0 hidden md:block" 
              style={{ background: `linear-gradient(to right, transparent, ${t.background})` }}
            />
          </div>

          {/* Content Section */}
          <div className="relative w-[100vw] md:w-[50vw] h-[55vh] md:h-full flex flex-col justify-start p-6 md:p-16 overflow-y-auto">
            <h3 className="text-3xl md:text-5xl italic mb-3 block w-full" style={{ fontFamily: t.fontHeadline, color: t.onSurface, textShadow: `0 0 30px ${t.primary}1A` }}>
              {selectedProduct.name}
            </h3>
            <p className="text-sm md:text-lg mb-8 block w-full" style={{ color: t.onSurfaceVariant, lineHeight: 1.6 }}>
              {selectedProduct.desc}
            </p>

            <div className="flex flex-col gap-1 mb-10 w-full">
              <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] block" style={{ fontFamily: t.fontLabel, color: t.onSurfaceVariant }}>
                Precio
              </span>
              <span className="text-4xl md:text-5xl font-bold tracking-tighter block" style={{ fontFamily: t.fontLabel, color: t.primary }}>
                {selectedProduct.price}
              </span>
            </div>

            <button 
              className="w-full max-w-[340px] py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-xs transition-transform active:scale-95 duration-300 mx-auto md:mx-0 shrink-0"
              style={{ 
                background: `linear-gradient(to right, ${t.primary}, ${t.secondaryContainer})`, 
                color: t.onPrimary,
                fontFamily: t.fontLabel,
                boxShadow: `0 8px 30px ${t.primary}40`,
                display: 'block'
              }}
              onClick={() => {
                /* Add to cart logic could go here */
                setSelectedProduct(null);
              }}
            >
              Agregar a la orden
            </button>
            <div className="h-12 w-full shrink-0" /> {/* Extra spacing for mobile scrolling */}
          </div>
        </div>
      )}
      </div>
    )}
    </>
  );
}
