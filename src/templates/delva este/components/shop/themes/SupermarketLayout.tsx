import React from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product } from '@/lib/data/products';
import type { User } from '@/lib/types';
import ProductCard from '../../common/ProductCard';

interface SupermarketLayoutProps {
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
    storeProducts: Product[];
}

export const SupermarketLayout: React.FC<SupermarketLayoutProps> = ({
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
    globalCategories: _globalCategories,
    renderThemeSelector,
    storeProducts
}) => {
    const G = '#00a651'; // supermarket green
    const GLight = '#e8f5e9';
    const GDark = '#007a3d';

    return (
        <div style={{ minHeight: '100vh', background: '#f5f5f5', paddingBottom: '100px', fontFamily: 'Inter, sans-serif' }}>
            {/* TOP GREEN HEADER */}
            <div style={{ background: G, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 60, zIndex: 50, boxShadow: '0 2px 8px rgba(0,166,81,0.3)' }}>
                {/* Logo circle */}
                <div style={{ width: '36px', height: '36px', background: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {storeLogo ? <img src={storeLogo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontWeight: 900, fontSize: '1rem', color: G }}>G</span>}
                </div>
                {/* Search bar */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <input
                        type="text"
                        placeholder={`Buscar en ${storeName}...`}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '10px 40px 10px 16px', borderRadius: '8px', border: 'none', fontSize: '0.9rem', outline: 'none', background: 'white', boxSizing: 'border-box' }}
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: G, fontWeight: 700 }}>🔍</span>
                </div>
            </div>

            {/* STORE TITLE BANNER */}
            <div style={{ position: 'relative', height: '160px', overflow: 'hidden' }}>
                <img
                    src={storeBanner || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    alt="Banner tienda"
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 100%)', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
                    <div>
                        <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900, margin: '0 0 4px', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>{storeName}</h1>
                        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem', margin: 0, maxWidth: '280px' }}>{storeBio}</p>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <span style={{ background: G, color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700 }}>⭐ 5.0</span>
                            <span style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700 }}>{storeProducts.length} productos</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* EDIT PANEL TOGGLE */}
            {currentUser?.id === storeOwner?.id && !isGuestView && (
                <div style={{ padding: '8px 16px', background: '#fff3e0', borderBottom: '2px solid #ff9800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e65100' }}>⚙️ Panel del dueño</span>
                    <button onClick={() => setIsEditingStore(!isEditingStore)} style={{ background: '#ff9800', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
                        {isEditingStore ? 'Cerrar' : 'Personalizar Tienda'}
                    </button>
                </div>
            )}

            {/* EDIT PANEL */}
            {isEditingStore && currentUser?.id === storeOwner?.id && !isGuestView && (
                <div style={{ margin: '0 16px 16px', padding: '20px', background: 'white', borderRadius: '12px', border: `2px solid ${G}`, marginTop: '12px' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: G, marginBottom: '16px' }}>🎨 Ajustes de tu Tienda</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Logo & Banner Uploads */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div style={{ background: GLight, padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: G, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800 }}>{storeLogo ? <img src={storeLogo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏬'}</div>
                                <p style={{ fontSize: '0.65rem', fontWeight: 700, margin: 0, textAlign: 'center' }}>Logo de la Tienda</p>
                                <button onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = async (e: any) => { if (e.target.files[0]) { const c = await compressImage(e.target.files[0]); await setDoc(doc(db, 'users', currentUser!.id), { ...currentUser, storeLogo: c }, { merge: true }); } }; i.click(); }} style={{ background: G, color: 'white', border: 'none', padding: '4px 10px', borderRadius: '8px', fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer' }}>Subir</button>
                            </div>
                            <div style={{ background: GLight, padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                                <div style={{ width: '80px', height: '50px', borderRadius: '8px', background: G, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800 }}>{storeBanner ? <img src={storeBanner} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🖼️'}</div>
                                <p style={{ fontSize: '0.65rem', fontWeight: 700, margin: 0, textAlign: 'center' }}>Banner Portada</p>
                                <button onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = async (e: any) => { if (e.target.files[0]) { const c = await compressImage(e.target.files[0]); await setDoc(doc(db, 'users', currentUser!.id), { ...currentUser, storeBanner: c }, { merge: true }); } }; i.click(); }} style={{ background: G, color: 'white', border: 'none', padding: '4px 10px', borderRadius: '8px', fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer' }}>Subir</button>
                            </div>
                        </div>
                        {/* Store Name */}
                        <input type="text" defaultValue={storeName} onBlur={async (e) => { const v = e.target.value.trim(); if (v) await setDoc(doc(db, 'users', currentUser!.id), { ...currentUser, storeName: v }, { merge: true }); }} placeholder="Nombre de tu tienda" style={{ padding: '10px 14px', borderRadius: '8px', border: `1.5px solid ${G}`, outline: 'none', fontSize: '0.9rem', fontWeight: 700 }} />
                        {/* Bio */}
                        <textarea defaultValue={storeBio} onBlur={async (e) => { await setDoc(doc(db, 'users', currentUser!.id), { ...currentUser, storeBio: e.target.value.trim() }, { merge: true }); }} placeholder="Descripción de tu tienda..." style={{ padding: '10px 14px', borderRadius: '8px', border: `1.5px solid ${G}`, outline: 'none', fontSize: '0.85rem', resize: 'none', height: '70px' }} />

                        {/* CATEGORIES MANAGER */}
                        <div style={{ background: GLight, borderRadius: '10px', padding: '12px' }}>
                            <p style={{ fontSize: '0.7rem', fontWeight: 800, color: GDark, marginBottom: '10px' }}>🏷️ Categorías de mi Tienda</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                                {(storeOwner?.storeCategories || []).map((cat: {id: string; name: string}, i: number) => (
                                    <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: G, color: 'white', borderRadius: '20px', padding: '4px 10px', fontSize: '0.7rem', fontWeight: 700 }}>
                                        <span>{cat.name}</span>
                                        <button onClick={async () => { const updated = (storeOwner?.storeCategories || []).filter((_: {id: string; name: string}, j: number) => j !== i); await saveCats(updated); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.8rem', padding: '0 2px', lineHeight: 1 }}>✕</button>
                                    </div>
                                ))}
                                {!(storeOwner?.storeCategories?.length) && <p style={{ fontSize: '0.65rem', opacity: 0.6, margin: 0 }}>Sin categorías personalizadas aún</p>}
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Ej: Frutas, Bebidas..." onKeyDown={async (e) => { if (e.key === 'Enter' && newCatName.trim()) { const id = newCatName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''); const updated = [...(storeOwner?.storeCategories || []), { id, name: newCatName.trim() }]; await saveCats(updated); setNewCatName(''); } }} style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', border: `1.5px solid ${G}`, outline: 'none', fontSize: '0.78rem' }} />
                                <button onClick={async () => { if (newCatName.trim()) { const id = newCatName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''); const updated = [...(storeOwner?.storeCategories || []), { id, name: newCatName.trim() }]; await saveCats(updated); setNewCatName(''); } }} style={{ background: G, color: 'white', border: 'none', padding: '7px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>+ Añadir</button>
                            </div>
                        </div>

                        {/* DEFAULT CATEGORIES TOGGLE (SUPERMARKET) */}
                        {themeDefaults && (
                            <div style={{ background: GLight, borderRadius: '10px', padding: '12px' }}>
                                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: GDark, marginBottom: '8px' }}>👁️ Mostrar Categorías Sugeridas</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {themeDefaults.categories.map((cat: any) => {
                                        const isHidden = disabledCats.includes(cat.id);
                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => toggleDefaultCat(cat.id)}
                                                style={{
                                                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700,
                                                    background: isHidden ? 'white' : G,
                                                    color: isHidden ? '#888' : 'white',
                                                    border: `1px solid ${isHidden ? '#ddd' : G}`,
                                                    cursor: 'pointer', transition: '0.2s'
                                                }}
                                            >
                                                {isHidden ? '🕶️ ' : '✅ '}{cat.name}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p style={{ fontSize: '0.55rem', opacity: 0.6, marginTop: '5px' }}>Toca para ocultar o mostrar las categorías que vienen con el diseño.</p>
                            </div>
                        )}

                        {/* TAGS MANAGER */}
                        <div style={{ background: GLight, borderRadius: '10px', padding: '12px' }}>
                            <p style={{ fontSize: '0.7rem', fontWeight: 800, color: GDark, marginBottom: '10px' }}>🔖 Etiquetas de mis Productos</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                                {storeTags.map((tag, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: GDark, color: 'white', borderRadius: '20px', padding: '4px 10px', fontSize: '0.7rem', fontWeight: 700 }}>
                                        <span>#{tag}</span>
                                        <button onClick={async () => { const updated = storeTags.filter((_, j) => j !== i); await saveTags(updated); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.8rem', padding: '0 2px', lineHeight: 1 }}>✕</button>
                                    </div>
                                ))}
                                {!storeTags.length && <p style={{ fontSize: '0.65rem', opacity: 0.6, margin: 0 }}>Añade etiquetas para filtrar productos</p>}
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Ej: oferta, nuevo, vegano..." onKeyDown={async (e) => { if (e.key === 'Enter' && newTag.trim()) { const updated = [...storeTags, newTag.trim().toLowerCase()]; await saveTags(updated); setNewTag(''); } }} style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', border: `1.5px solid ${G}`, outline: 'none', fontSize: '0.78rem' }} />
                                <button onClick={async () => { if (newTag.trim()) { const updated = [...storeTags, newTag.trim().toLowerCase()]; await saveTags(updated); setNewTag(''); } }} style={{ background: GDark, color: 'white', border: 'none', padding: '7px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>+ Añadir</button>
                            </div>
                        </div>


                        {/* Share */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => window.open(`${window.location.origin}/tienda?u=${currentUser!.id}&viewAsGuest=true`, '_blank')} style={{ flex: 1, padding: '10px', background: GLight, color: GDark, border: `1.5px solid ${G}`, borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>👀 Ver como cliente</button>
                            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/tienda?u=${currentUser!.id}`); alert('¡Link copiado!'); }} style={{ flex: 1, padding: '10px', background: G, color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>🔗 Copiar Link</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CATEGORY HORIZONTAL SCROLL */}
            <div style={{ background: 'white', borderBottom: '1px solid #e0e0e0', padding: '0 16px' }}>
                <div className="gallery-scroll" style={{ display: 'flex', gap: '0', overflowX: 'auto' }}>
                    <button onClick={() => setActiveCategory('all')} style={{ padding: '14px 18px', background: 'none', border: 'none', borderBottom: activeCategory === 'all' ? `3px solid ${G}` : '3px solid transparent', color: activeCategory === 'all' ? G : '#555', fontWeight: activeCategory === 'all' ? 800 : 500, fontSize: '0.82rem', whiteSpace: 'nowrap', cursor: 'pointer', transition: '0.2s' }}>
                        Todo
                    </button>
                    {storeCategories.slice(1).map(cat => (
                        <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{ padding: '14px 18px', background: 'none', border: 'none', borderBottom: activeCategory === cat.id ? `3px solid ${G}` : '3px solid transparent', color: activeCategory === cat.id ? G : '#555', fontWeight: activeCategory === cat.id ? 800 : 500, fontSize: '0.82rem', whiteSpace: 'nowrap', cursor: 'pointer', transition: '0.2s' }}>
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* TOP PROMO BANNER */}
            <div style={{ margin: '0 16px 16px', marginTop: '16px', background: `linear-gradient(135deg, ${G} 0%, ${GDark} 100%)`, borderRadius: '12px', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.85, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Compras de hoy</p>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0 0 10px', lineHeight: 1.2 }}>¡Compra Fresco<br />y Ahorra! 🥦</h2>
                    <div style={{ background: 'rgba(0,0,0,0.2)', color: 'white', border: '2px solid rgba(255,255,255,0.4)', padding: '8px 20px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, display: 'inline-block' }}>VER OFERTAS</div>
                </div>
                <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '130px', height: '130px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
                <div style={{ position: 'absolute', right: '30px', bottom: '-30px', width: '90px', height: '90px', background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }}></div>
            </div>

            {/* PRODUCTS GRID - SUPERMARKET STYLE */}
            <div style={{ padding: '0 16px' }}>
                {displayProducts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px 0', color: '#aaa' }}>
                        <p style={{ fontSize: '3rem' }}>🥬</p>
                        <p style={{ fontWeight: 700 }}>No encontramos productos.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                        {displayProducts.map(p => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>
                )}
            </div>
            {renderThemeSelector()}
        </div>
    );
};
