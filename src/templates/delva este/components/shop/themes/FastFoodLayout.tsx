import React from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product } from '@/lib/data/products';
import type { User } from '@/lib/types';
import ProductCard from '../../common/ProductCard';

interface FastFoodLayoutProps {
    storeName: string;
    storeLogo: string | null;
    storeBio: string;
    storeBanner: string | null;
    storeOwner: any;
    currentUser: any;
    isGuestView: boolean;
    storeCategories: { id: string; name: string }[];
    activeCategory: string;
    setActiveCategory: (id: string) => void;
    displayProducts: Product[];
    isEditingStore: boolean;
    setIsEditingStore: (val: boolean) => void;
    onQuickAdd?: (p: Product) => void;
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
    setEditingProduct: (product: any) => void;
}

export const FastFoodLayout: React.FC<FastFoodLayoutProps> = ({
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
    onQuickAdd,
    compressImage,
    saveCats,
    saveTags: _saveTags,
    toggleDefaultCat: _toggleDefaultCat,
    newCatName,
    setNewCatName,
    newTag: _newTag,
    setNewTag: _setNewTag,
    storeTags: _storeTags,
    themeDefaults: _themeDefaults,
    disabledCats: _disabledCats,
    searchTerm,
    setSearchTerm,
    globalCategories,
    renderThemeSelector,
    setEditingProduct
}) => {
    const O = '#ff5722'; // orange
    const B = '#212121'; // black/dark grey
    const L = '#fff8f1'; // light crema

    return (
        <div style={{ minHeight: '100vh', background: L, paddingBottom: '100px', fontFamily: "'Outfit', sans-serif" }}>
            {/* HERO BANNER - FOOD STYLE */}
            <div style={{ position: 'relative', height: '240px', background: B, overflow: 'hidden' }}>
                <img
                    src={storeBanner || 'https://images.unsplash.com/photo-1562967914-6cbb241c2b3f?w=1200&q=80'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}
                    alt="Fast food banner"
                />
                <div style={{ position: 'absolute', inset: 0, padding: '25px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'linear-gradient(90deg, rgba(0,0,0,0.8), transparent)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                        <div style={{ width: '70px', height: '70px', borderRadius: '14px', border: `3px solid ${O}`, background: 'white', overflow: 'hidden' }}>
                            {storeLogo ? <img src={storeLogo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '2rem', display: 'flex', justifyContent: 'center', marginTop: '10px' }}>🍗</span>}
                        </div>
                        <div>
                            <h1 style={{ color: 'white', fontSize: '1.6rem', fontWeight: 900, margin: 0, textTransform: 'uppercase' }}>{storeName}</h1>
                            <p style={{ color: 'white', fontSize: '0.8rem', opacity: 0.9, margin: 0 }}>Buen provecho 🍴</p>
                        </div>
                    </div>
                    <p style={{ color: 'white', fontSize: '0.75rem', maxWidth: '300px', margin: 0, fontStyle: 'italic' }}>{storeBio}</p>
                </div>
            </div>

            {/* EDIT PANEL TOGGLE (FOOD) */}
            {currentUser?.id === storeOwner?.id && !isGuestView && (
                <div style={{ padding: '10px 20px', background: '#fff', borderBottom: `2px solid ${O}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => setIsEditingStore(!isEditingStore)} style={{ background: O, color: 'white', border: 'none', padding: '6px 16px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>
                        {isEditingStore ? 'Cerrar Ajustes' : '⚙️ Personalizar Carta'}
                    </button>
                    <button onClick={() => setEditingProduct({ title: '', price: '', categoryId: globalCategories[1]?.id || 'varios', image: '', gallery: [], colors: [], tags: [] })} style={{ background: B, color: 'white', border: 'none', padding: '6px 16px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>
                        + Añadir Plato
                    </button>
                </div>
            )}

            {/* EDIT PANEL (FOOD) */}
            {isEditingStore && currentUser?.id === storeOwner?.id && !isGuestView && (
                <div style={{ margin: '15px 20px', padding: '20px', background: 'white', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: O, marginBottom: '20px' }}>🍔 Personaliza tu Negocio</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ background: '#fafafa', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ width: '50px', height: '50px', background: O, borderRadius: '12px', margin: '0 auto 8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>{storeLogo ? <img src={storeLogo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🍗'}</div>
                                <button onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = async (e: any) => { if (e.target.files[0]) { const c = await compressImage(e.target.files[0]); await setDoc(doc(db, 'users', currentUser!.id), { ...currentUser, storeLogo: c }, { merge: true }); } }; i.click(); }} style={{ background: 'none', border: `1px solid ${O}`, color: O, padding: '4px 10px', borderRadius: '8px', fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer' }}>Logo</button>
                            </div>
                            <div style={{ background: '#fafafa', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ width: '80px', height: '50px', background: B, borderRadius: '8px', margin: '0 auto 8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>{storeBanner ? <img src={storeBanner} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🖼️'}</div>
                                <button onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = async (e: any) => { if (e.target.files[0]) { const c = await compressImage(e.target.files[0]); await setDoc(doc(db, 'users', currentUser!.id), { ...currentUser, storeBanner: c }, { merge: true }); } }; i.click(); }} style={{ background: 'none', border: `1px solid ${O}`, color: O, padding: '4px 10px', borderRadius: '8px', fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer' }}>Banner</button>
                            </div>
                        </div>
                        <input type="text" defaultValue={storeName} onBlur={async (e) => { const v = e.target.value.trim(); if (v) await setDoc(doc(db, 'users', currentUser!.id), { ...currentUser, storeName: v }, { merge: true }); }} placeholder="Nombre del Restaurante" style={{ padding: '12px', borderRadius: '10px', border: '1.5px solid #eee', outline: 'none', fontSize: '0.9rem', fontWeight: 800 }} />
                        <textarea defaultValue={storeBio} onBlur={async (e) => { await setDoc(doc(db, 'users', currentUser!.id), { ...currentUser, storeBio: e.target.value.trim() }, { merge: true }); }} placeholder="Escribe algo tentador..." style={{ padding: '12px', borderRadius: '10px', border: '1.5px solid #eee', outline: 'none', fontSize: '0.85rem', resize: 'none', height: '60px' }} />

                        <div style={{ background: L, padding: '15px', borderRadius: '12px' }}>
                            <p style={{ fontSize: '0.7rem', fontWeight: 900, color: O, marginBottom: '10px', textTransform: 'uppercase' }}>Secciones de tu Carta</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                                {(storeOwner?.storeCategories || []).map((cat: {id: string; name: string}, i: number) => (
                                    <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: O, color: 'white', padding: '5px 12px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 800 }}>
                                        <span>{cat.name}</span>
                                        <button onClick={async () => { const updated = (storeOwner?.storeCategories || []).filter((_: {id: string; name: string}, j: number) => j !== i); await saveCats(updated); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Ej: Combos..." onKeyDown={async (e) => { if (e.key === 'Enter' && newCatName.trim()) { const id = newCatName.trim().toLowerCase().replace(/\s+/g, '-'); const updated = [...(storeOwner?.storeCategories || []), { id, name: newCatName.trim() }]; await saveCats(updated); setNewCatName(''); } }} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.8rem' }} />
                                <button onClick={async () => { if (newCatName.trim()) { const id = newCatName.trim().toLowerCase().replace(/\s+/g, '-'); const updated = [...(storeOwner?.storeCategories || []), { id, name: newCatName.trim() }]; await saveCats(updated); setNewCatName(''); } }} style={{ background: O, color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 900 }}>+</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CATEGORY NAV (FOOD) */}
            <div style={{ background: 'white', position: 'sticky', top: 60, zIndex: 50, borderBottom: '1.5px solid #eee', overflowX: 'auto' }}>
                <div style={{ display: 'flex', gap: '15px', padding: '15px 20px' }}>
                    {storeCategories.map(cat => (
                        <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{ padding: '8px 20px', background: activeCategory === cat.id ? O : 'none', color: activeCategory === cat.id ? 'white' : '#555', border: activeCategory === cat.id ? `1.5px solid ${O}` : '1.5px solid #ddd', borderRadius: '30px', fontSize: '0.75rem', fontWeight: 800, whiteSpace: 'nowrap', cursor: 'pointer', transition: '0.2s' }}>
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* SEARCH BAR (FOOD) */}
            <div style={{ padding: '20px' }}>
                <div style={{ position: 'relative' }}>
                    <input type="text" placeholder="¿Qué se te antoja hoy?" value={searchTerm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '14px 20px', borderRadius: '15px', border: '1.5px solid #eee', background: 'white', fontSize: '0.9rem', outline: 'none' }} />
                    <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)' }}>🍗</span>
                </div>
            </div>

            {/* PRODUCT LIST (FOOD STYLE) */}
            <div style={{ padding: '0 20px' }}>
                {activeCategory === 'all' ? storeCategories.slice(1).map((cat: {id: string; name: string}, i: number) => (
                    <div key={i} style={{ marginBottom: '40px' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '15px' }}>{cat.name}</h3>
                        <div className="fast-food-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
                            {displayProducts.filter((p: Product) => p.categoryId === cat.id).map((p: Product) => (
                                <ProductCard key={p.id} product={p} onQuickAdd={onQuickAdd} />
                            ))}
                        </div>
                    </div>
                )) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
                        {displayProducts.map((p: Product) => (
                            <ProductCard key={p.id} product={p} onQuickAdd={onQuickAdd} />
                        ))}
                    </div>
                )}
                {displayProducts.length === 0 && <div style={{ textAlign: 'center', padding: '60px 0', opacity: 0.5 }}>🍔 No hay platos en esta categoría aún.</div>}
            </div>

            {renderThemeSelector()}
        </div>
    );
};
