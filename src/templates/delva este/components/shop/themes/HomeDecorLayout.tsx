import React from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product } from '@/lib/data/products';
import type { User } from '@/lib/types';
import ProductCard from '../../common/ProductCard';

interface HomeDecorLayoutProps {
    storeName: string;
    storeLogo: string | null;
    storeBio: string;
    storeBanner: string | null;
    storeOwner: User | undefined;
    currentUser: User | null;
    isGuestView: boolean;
    storeCategories: { id: string; name: string }[];
    activeCategory: string;
    setActiveCategory: (id: string) => void;
    displayProducts: Product[];
    isEditingStore: boolean;
    setIsEditingStore: (val: boolean) => void;
    compressImage: (file: File) => Promise<string>;
    saveCats: (cats: { id: string; name: string }[]) => Promise<void>;
    saveTags: (tags: string[]) => Promise<void>;
    toggleDefaultCat: (catId: string) => Promise<void>;
    newCatName: string;
    setNewCatName: (val: string) => void;
    newTag: string;
    setNewTag: (val: string) => void;
    storeTags: string[];
    themeDefaults: any;
    disabledCats: string[];
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    globalCategories: { id: string; name: string }[];
    renderThemeSelector: () => React.ReactNode;
}

export const HomeDecorLayout: React.FC<HomeDecorLayoutProps> = ({
    storeName,
    storeLogo,
    storeBio,
    storeBanner,
    storeOwner,
    currentUser,
    isGuestView,
    storeCategories,
    activeCategory,
    setActiveCategory,
    displayProducts,
    isEditingStore,
    setIsEditingStore,
    compressImage,
    saveCats,
    saveTags,
    toggleDefaultCat,
    newCatName,
    setNewCatName,
    newTag,
    setNewTag,
    storeTags,
    themeDefaults,
    disabledCats,
    searchTerm,
    setSearchTerm,
    globalCategories,
    renderThemeSelector
}) => {
    const N = '#1b3a5c';     // navy primary
    const NLight = '#e8eef5';
    const NAcc = '#c9a84c';  // golden accent

    return (
        <div style={{ minHeight: '100vh', background: '#f9f9f7', paddingBottom: '100px', fontFamily: 'Inter, sans-serif' }}>
            {/* TOP NAVY NAV BAR */}
            <div style={{ background: N, color: 'white', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '20px', position: 'sticky', top: 60, zIndex: 50, boxShadow: '0 2px 10px rgba(27,58,92,0.4)', height: '52px' }}>
                {/* Hamburger + Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <span style={{ fontSize: '1.2rem', cursor: 'pointer', opacity: 0.8 }}>☰</span>
                    {storeLogo
                        ? <img src={storeLogo} style={{ height: '28px', objectFit: 'contain' }} alt={storeName} />
                        : <span style={{ fontWeight: 900, fontSize: '1rem', letterSpacing: '1.5px', textTransform: 'uppercase' }}>{storeName}</span>
                    }
                </div>
                {/* Nav categories */}
                <div className="gallery-scroll" style={{ display: 'flex', gap: '0', flex: 2, justifyContent: 'center', overflowX: 'auto' }}>
                    {storeCategories.map(cat => (
                        <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{ padding: '0 16px', height: '52px', background: 'none', border: 'none', borderBottom: activeCategory === cat.id ? `3px solid ${NAcc}` : '3px solid transparent', color: activeCategory === cat.id ? NAcc : 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap', cursor: 'pointer', letterSpacing: '0.5px' }}>
                            {cat.id === 'all' ? 'Todo' : cat.name}
                        </button>
                    ))}
                </div>
                {/* Search + cart icons */}
                <div style={{ display: 'flex', gap: '16px', fontSize: '1.1rem', opacity: 0.85 }}>
                    <span style={{ cursor: 'pointer' }}>🔍</span>
                    <span style={{ cursor: 'pointer' }}>🛒</span>
                </div>
            </div>

            {/* HERO BANNER */}
            <div style={{ position: 'relative', height: '260px', overflow: 'hidden' }}>
                <img
                    src={storeBanner || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    alt="Hero"
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(27,58,92,0.85) 0%, transparent 65%)', display: 'flex', alignItems: 'center', padding: '0 30px' }}>
                    <div>
                        <p style={{ color: NAcc, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 8px' }}>DISEÑO & CONFORT</p>
                        <h1 style={{ color: 'white', fontSize: '2rem', fontWeight: 900, margin: '0 0 6px', lineHeight: 1.1, textTransform: 'uppercase', maxWidth: '250px' }}>
                            ESPACIOS<br />QUE INSPIRAN
                        </h1>
                        <div style={{ background: 'white', color: N, padding: '10px 22px', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 800, display: 'inline-block', cursor: 'pointer', marginTop: '10px', letterSpacing: '1px' }}>
                            COMPRAR EL LOOK
                        </div>
                    </div>
                </div>
                {/* Slide dots */}
                <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px' }}>
                    {[0, 1, 2, 3].map(i => <div key={i} style={{ width: i === 0 ? '18px' : '6px', height: '6px', borderRadius: '3px', background: i === 0 ? NAcc : 'rgba(255,255,255,0.5)' }}></div>)}
                </div>
            </div>

            {/* OWNER PANEL BAR */}
            {currentUser?.id === storeOwner?.id && !isGuestView && (
                <div style={{ padding: '8px 20px', background: '#fff8e1', borderBottom: '2px solid #f9a825', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e65100' }}>⚙️ Panel Propietario</span>
                    <button onClick={() => setIsEditingStore(!isEditingStore)} style={{ background: '#f9a825', color: 'white', border: 'none', padding: '5px 14px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
                        {isEditingStore ? 'Cerrar' : 'Personalizar'}
                    </button>
                </div>
            )}

            {/* OWNER EDIT PANEL */}
            {isEditingStore && currentUser?.id === storeOwner?.id && !isGuestView && (
                <div style={{ margin: '16px 20px', padding: '20px', background: 'white', border: `2px solid ${N}`, borderRadius: '8px' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: N, marginBottom: '16px' }}>🎨 Personalización de Tienda</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Logo/Banner */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {[{ key: 'storeLogo', label: 'Logo', preview: storeLogo, shape: 'circle' }, { key: 'storeBanner', label: 'Banner Hero', preview: storeBanner, shape: 'rect' }].map(({ key, label, preview, shape }) => (
                                <div key={key} style={{ background: NLight, padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: shape === 'circle' ? '48px' : '80px', height: '48px', borderRadius: shape === 'circle' ? '50%' : '6px', background: N, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800 }}>
                                        {preview ? <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (shape === 'circle' ? '🏠' : '🖼️')}
                                    </div>
                                    <p style={{ fontSize: '0.62rem', fontWeight: 700, margin: 0 }}>{label}</p>
                                    <button onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = async (e: any) => { if (e.target.files[0]) { const c = await compressImage(e.target.files[0]); await setDoc(doc(db, 'users', currentUser!.id), { ...currentUser, [key]: c }, { merge: true }); } }; i.click(); }} style={{ background: N, color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer' }}>Subir</button>
                                </div>
                            ))}
                        </div>
                        <input type="text" defaultValue={storeName} onBlur={async (e) => { const v = e.target.value.trim(); if (v) await setDoc(doc(db, 'users', currentUser!.id), { ...currentUser, storeName: v }, { merge: true }); }} placeholder="Nombre de la marca" style={{ padding: '10px 14px', borderRadius: '4px', border: `1.5px solid ${N}`, outline: 'none', fontSize: '0.88rem', fontWeight: 700 }} />
                        <textarea defaultValue={storeBio} onBlur={async (e) => { await setDoc(doc(db, 'users', currentUser!.id), { ...currentUser, storeBio: e.target.value.trim() }, { merge: true }); }} placeholder="Descripción..." style={{ padding: '10px 14px', borderRadius: '4px', border: `1.5px solid ${N}`, outline: 'none', fontSize: '0.85rem', resize: 'none', height: '70px' }} />

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => window.open(`${window.location.origin}/tienda?u=${currentUser!.id}&viewAsGuest=true`, '_blank')} style={{ flex: 1, padding: '10px', background: NLight, color: N, border: `1.5px solid ${N}`, borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>👀 Ver como cliente</button>
                            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/tienda?u=${currentUser!.id}`); alert('¡Link copiado! 🏠'); }} style={{ flex: 1, padding: '10px', background: N, color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>🔗 Copiar Link</button>
                        </div>

                        {/* CATEGORIES MANAGER (HOME DECOR) */}
                        <div style={{ background: NLight, borderRadius: '8px', padding: '15px' }}>
                            <p style={{ fontSize: '0.7rem', fontWeight: 800, color: N, marginBottom: '10px' }}>🏷️ Mis Categorías</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                                {(storeOwner?.storeCategories || []).map((cat: {id: string; name: string}, i: number) => (
                                    <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: N, color: 'white', borderRadius: '4px', padding: '4px 10px', fontSize: '0.65rem', fontWeight: 700 }}>
                                        <span>{cat.name}</span>
                                        <button onClick={async () => { const updated = (storeOwner?.storeCategories || []).filter((_: {id: string; name: string}, j: number) => j !== i); await saveCats(updated); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>✕</button>
                                    </div>
                                ))}
                                {!(storeOwner?.storeCategories?.length) && <p style={{ fontSize: '0.62rem', opacity: 0.6, margin: 0 }}>Sin categorías propias</p>}
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Añadir categoría..." onKeyDown={async (e) => { if (e.key === 'Enter' && newCatName.trim()) { const id = newCatName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''); const updated = [...(storeOwner?.storeCategories || []), { id, name: newCatName.trim() }]; await saveCats(updated); setNewCatName(''); } }} style={{ flex: 1, padding: '8px 10px', borderRadius: '4px', border: `1.5px solid ${N}`, outline: 'none', fontSize: '0.75rem' }} />
                                <button onClick={async () => { if (newCatName.trim()) { const id = newCatName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''); const updated = [...(storeOwner?.storeCategories || []), { id, name: newCatName.trim() }]; await saveCats(updated); setNewCatName(''); } }} style={{ background: N, color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>+</button>
                            </div>
                        </div>

                        {/* THEME DEFAULTS (HOME DECOR) */}
                        {themeDefaults && (
                            <div style={{ background: NLight, borderRadius: '8px', padding: '15px' }}>
                                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: N, marginBottom: '10px' }}>👁️ Categorías del Diseño</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {themeDefaults.categories.map((cat: any) => {
                                        const isHidden = disabledCats.includes(cat.id);
                                        return (
                                            <button key={cat.id} onClick={() => toggleDefaultCat(cat.id)} style={{ padding: '6px 12px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700, background: isHidden ? 'white' : N, color: isHidden ? N : 'white', border: `1px solid ${N}`, cursor: 'pointer', transition: '0.2s' }}>
                                                {isHidden ? 'Oculto: ' : 'Visible: '}{cat.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* TAGS (HOME DECOR) */}
                        <div style={{ background: NLight, borderRadius: '8px', padding: '15px' }}>
                            <p style={{ fontSize: '0.7rem', fontWeight: 800, color: N, marginBottom: '10px' }}>🔖 Mis Etiquetas</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                                {storeTags.map((tag, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'white', border: `1px solid ${N}44`, color: N, borderRadius: '4px', padding: '4px 10px', fontSize: '0.65rem', fontWeight: 700 }}>
                                        <span>#{tag}</span>
                                        <button onClick={async () => { const updated = storeTags.filter((_, j) => j !== i); await saveTags(updated); }} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>✕</button>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Nueva etiqueta..." onKeyDown={async (e) => { if (e.key === 'Enter' && newTag.trim()) { const updated = [...storeTags, newTag.trim().toLowerCase()]; await saveTags(updated); setNewTag(''); } }} style={{ flex: 1, padding: '8px 10px', borderRadius: '4px', border: `1.5px solid ${N}`, outline: 'none', fontSize: '0.75rem' }} />
                                <button onClick={async () => { if (newTag.trim()) { const updated = [...storeTags, newTag.trim().toLowerCase()]; await saveTags(updated); setNewTag(''); } }} style={{ background: N, color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>+</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SEARCH BAR */}
            <div style={{ padding: '16px 20px 8px', background: 'white', position: 'sticky', top: 112, zIndex: 40, borderBottom: '1px solid #e8e8e8' }}>
                <div style={{ position: 'relative' }}>
                    <input type="text" placeholder="Buscar muebles, decoración..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '11px 44px 11px 16px', borderRadius: '4px', border: '1.5px solid #ddd', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
                    <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: N, fontSize: '0.9rem' }}>🔍</span>
                </div>
            </div>

            {/* PRODUCT GRID */}
            <div style={{ padding: '20px 20px 0' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
                    {activeCategory === 'all' ? 'Todos los productos' : globalCategories.find(c => c.id === activeCategory)?.name} · {displayProducts.length} artículos
                </p>
                {displayProducts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: '#bbb' }}>
                        <p style={{ fontSize: '3rem' }}>🛋️</p>
                        <p style={{ fontWeight: 700 }}>Sin productos en esta categoría.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
                        {displayProducts.map(p => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>
                )}
            </div>

            {/* AMBIENTES SECTION */}
            {displayProducts.length > 0 && (
                <div style={{ padding: '30px 20px 0' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#222', marginBottom: '16px', letterSpacing: '-0.3px' }}>Nuestros Ambientes</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {[
                            { label: 'Sala', url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=60' },
                            { label: 'Comedor', url: 'https://images.unsplash.com/photo-1549187774-b4e9b0445b41?w=400&q=60' },
                            { label: 'Dormitorio', url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400&q=60' },
                            { label: 'Terraza', url: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=400&q=60' },
                        ].map(({ label, url }) => (
                            <div key={label} style={{ position: 'relative', height: '100px', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer' }}>
                                <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={label} />
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(27,58,92,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ color: 'white', fontWeight: 800, fontSize: '0.85rem', textShadow: '0 1px 4px rgba(0,0,0,0.5)', letterSpacing: '0.5px' }}>{label}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {renderThemeSelector()}
        </div>
    );
};
