import React from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product } from '@/lib/data/products';
import type { User } from '@/lib/types';
import ProductCard from '../../common/ProductCard';

interface LuxGoldLayoutProps {
    storeName: string;
    storeLogo: string | null;
    storeBio: string;
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
    alertAction: (title: string, message: string) => void;
    renderThemeSelector: () => React.ReactNode;
}

export const LuxGoldLayout: React.FC<LuxGoldLayoutProps> = ({
    storeName,
    storeLogo,
    storeBio,
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
    alertAction,
    renderThemeSelector
}) => {
    const GOLD = '#8a6d3b';

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', paddingBottom: '100px', fontFamily: "'Prata', serif" }}>
            <div style={{ textAlign: 'center', padding: '60px 20px 40px', borderBottom: `1px solid ${GOLD}44` }}>
                {storeLogo ? (
                    <img src={storeLogo} style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '20px', border: `1px solid ${GOLD}` }} alt="Logo" />
                ) : (
                    <div style={{ fontSize: '3rem', color: GOLD, fontWeight: '100', marginBottom: '10px' }}>✧</div>
                )}
                <h1 style={{ fontSize: '2.5rem', fontWeight: '400', letterSpacing: '4px', textTransform: 'uppercase', color: GOLD, margin: '0 0 10px' }}>{storeName}</h1>
                <p style={{ opacity: 0.7, fontSize: '0.9rem', maxWidth: '600px', margin: '0 auto', fontStyle: 'italic' }}>{storeBio}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', padding: '20px', position: 'sticky', top: 60, background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(5px)', zIndex: 10 }}>
                {storeCategories.map(cat => {
                    const isSel = activeCategory === cat.id;
                    const name = cat.id === 'all' ? 'Colección' : cat.name;
                    return (
                        <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{ background: 'none', border: 'none', borderBottom: isSel ? `1px solid ${GOLD}` : '1px solid transparent', color: isSel ? GOLD : 'white', cursor: 'pointer', padding: '5px 10px', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase', transition: '0.3s' }}>
                            {name}
                        </button>
                    );
                })}
            </div>

            <div className="grid" style={{ padding: '40px 20px' }}>
                {displayProducts.map(p => (
                    <ProductCard key={p.id} product={p} />
                ))}
            </div>

            {currentUser?.id === storeOwner?.id && !isGuestView && (
                <button onClick={() => setIsEditingStore(!isEditingStore)} style={{ position: 'fixed', bottom: '110px', right: '20px', background: GOLD, color: 'black', border: 'none', padding: '10px 20px', borderRadius: '0', fontWeight: 'bold', fontSize: '0.7rem', letterSpacing: '2px', cursor: 'pointer', zIndex: 100 }}>
                    {isEditingStore ? 'CERRAR PANEL' : 'EDITAR TIENDA'}
                </button>
            )}
            {isEditingStore && currentUser?.id === storeOwner?.id && (
                <div style={{ position: 'fixed', bottom: '150px', right: '20px', width: '320px', background: '#111', border: `1px solid ${GOLD}`, padding: '25px', zIndex: 100, boxShadow: `0 0 30px ${GOLD}33` }}>
                    <h3 style={{ fontSize: '0.9rem', color: GOLD, letterSpacing: '2px', marginBottom: '20px', textAlign: 'center' }}>BOUTIQUE AJUSTES</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                            <div onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = async (e: any) => { if (e.target.files[0]) { const c = await compressImage(e.target.files[0]); await setDoc(doc(db, 'users', currentUser!.id), { ...currentUser, storeLogo: c }, { merge: true }); } }; i.click(); }} style={{ width: '60px', height: '60px', borderRadius: '50%', border: `1px solid ${GOLD}`, background: '#000', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {storeLogo ? <img src={storeLogo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: GOLD, fontSize: '0.6rem' }}>LOGO</span>}
                            </div>
                        </div>
                        <input type="text" defaultValue={storeName} onBlur={async (e) => { const v = e.target.value.trim(); if (v) await setDoc(doc(db, 'users', currentUser!.id), { ...currentUser, storeName: v }, { merge: true }); }} placeholder="Nombre Boutique" style={{ background: 'none', border: 'none', borderBottom: `1px solid ${GOLD}44`, color: GOLD, padding: '8px', fontSize: '0.9rem', outline: 'none', textAlign: 'center' }} />
                        <textarea defaultValue={storeBio} onBlur={async (e) => { await setDoc(doc(db, 'users', currentUser!.id), { ...currentUser, storeBio: e.target.value.trim() }, { merge: true }); }} placeholder="Bio Colección..." style={{ background: 'none', border: `1px solid ${GOLD}22`, color: 'white', padding: '10px', fontSize: '0.8rem', outline: 'none', resize: 'none', height: '60px' }} />


                        {/* CATEGORIES MANAGER (LUX GOLD) */}
                        <div style={{ padding: '15px', border: `1px solid ${GOLD}44`, background: '#0a0a0a' }}>
                            <p style={{ fontSize: '0.6rem', color: GOLD, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>Colecciones Propias</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                                {(storeOwner?.storeCategories || []).map((cat: {id: string; name: string}, i: number) => (
                                    <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: `1px solid ${GOLD}`, color: GOLD, padding: '4px 10px', fontSize: '0.65rem' }}>
                                        <span>{cat.name}</span>
                                        <button onClick={async () => { const updated = (storeOwner?.storeCategories || []).filter((_: {id: string; name: string}, j: number) => j !== i); await saveCats(updated); }} style={{ background: 'none', border: 'none', color: GOLD, cursor: 'pointer', fontSize: '0.7rem', padding: 0 }}>✕</button>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Nombre Colección..." style={{ background: 'none', border: `1px solid ${GOLD}22`, color: 'white', padding: '6px', fontSize: '0.7rem', flex: 1, outline: 'none' }} />
                                <button onClick={async () => { if (newCatName.trim()) { const id = newCatName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''); const updated = [...(storeOwner?.storeCategories || []), { id, name: newCatName.trim() }]; await saveCats(updated); setNewCatName(''); } }} style={{ background: GOLD, color: 'black', border: 'none', padding: '6px 14px', fontSize: '0.65rem', fontWeight: 'bold' }}>+</button>
                            </div>
                        </div>

                        {/* THEME DEFAULTS (LUX GOLD) */}
                        {themeDefaults && (
                            <div style={{ padding: '15px', border: `1px solid ${GOLD}44`, background: '#0a0a0a' }}>
                                <p style={{ fontSize: '0.6rem', color: GOLD, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>👁️ Visibilidad de Sugerencias</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {themeDefaults.categories.map((cat: any) => {
                                        const isHidden = disabledCats.includes(cat.id);
                                        return (
                                            <button key={cat.id} onClick={() => toggleDefaultCat(cat.id)} style={{ padding: '6px 12px', border: `1px solid ${GOLD}`, background: isHidden ? 'none' : GOLD, color: isHidden ? GOLD : 'black', fontSize: '0.6rem', cursor: 'pointer' }}>
                                                {isHidden ? '✧ ' : '✨ '}{cat.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* TAGS (LUX GOLD) */}
                        <div style={{ padding: '15px', border: `1px solid ${GOLD}44`, background: '#0a0a0a' }}>
                            <p style={{ fontSize: '0.6rem', color: GOLD, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>Palabras Clave</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                                {storeTags.map((t, i) => (
                                    <div key={i} style={{ border: `1px solid ${GOLD}44`, color: 'white', padding: '4px 10px', fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span>#{t}</span>
                                        <button onClick={async () => { const updated = storeTags.filter((_, j) => j !== i); await saveTags(updated); }} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>✕</button>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Añadir etiqueta..." style={{ background: 'none', border: `1px solid ${GOLD}22`, color: 'white', padding: '6px', fontSize: '0.7rem', flex: 1, outline: 'none' }} />
                                <button onClick={async () => { if (newTag.trim()) { const updated = [...storeTags, newTag.trim().toLowerCase()]; await saveTags(updated); setNewTag(''); } }} style={{ background: GOLD, color: 'black', border: 'none', padding: '6px 14px', fontSize: '0.65rem', fontWeight: 'bold' }}>+</button>
                            </div>
                        </div>

                        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/tienda?u=${currentUser!.id}`); alertAction('Link Copiado', '¡Link de tu tienda copiado! ✨'); }} style={{ background: GOLD, color: 'black', border: 'none', padding: '12px', fontWeight: 'bold', fontSize: '0.7rem', letterSpacing: '1px', cursor: 'pointer' }}>COPIAR LINK DE TIENDA</button>
                    </div>
                </div>
            )}
            {renderThemeSelector()}
        </div>
    );
};
