import React from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product } from '@/lib/data/products';
import type { User } from '@/lib/types';
import ProductCard from '../../common/ProductCard';

interface TechNeonLayoutProps {
    storeName: string;
    storeLogo: string | null;
    storeBio: string;
    storeOwner: any;
    currentUser: any;
    isGuestView: boolean;
    storeCategories: { id: string; name: string }[];
    activeCategory: string;
    setActiveCategory: (id: string) => void;
    displayProducts: Product[];
    isEditingStore: boolean;
    setIsEditingStore: (val: boolean) => void;
    renderThemeSelector: () => React.ReactNode;
}

export const TechNeonLayout: React.FC<TechNeonLayoutProps> = ({
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
    renderThemeSelector
}) => {
    const NEON = '#00ffcc';
    const DARK = '#050a10';
    const SURF = '#0d1621';

    return (
        <div style={{ minHeight: '100vh', background: DARK, color: 'white', paddingBottom: '100px', fontFamily: "'Orbitron', sans-serif" }}>
            <div style={{ padding: '40px 20px', textAlign: 'center', borderBottom: `2px solid ${NEON}`, boxShadow: `0 0 20px ${NEON}22`, background: SURF }}>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '20px' }}>
                    <div style={{ width: '90px', height: '90px', borderRadius: '12px', border: `2px solid ${NEON}`, boxShadow: `0 0 15px ${NEON}`, overflow: 'hidden' }}>
                        {storeLogo ? <img src={storeLogo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '2rem' }}>🎮</span>}
                    </div>
                </div>
                <h1 style={{ fontSize: '2rem', fontWeight: '900', color: NEON, textShadow: `0 0 10px ${NEON}`, margin: '0 0 10px', textTransform: 'uppercase' }}>{storeName}</h1>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', maxWidth: '500px', margin: '0 auto' }}>{storeBio}</p>
            </div>

            <div style={{ display: 'flex', gap: '10px', padding: '20px', overflowX: 'auto', background: DARK, position: 'sticky', top: 60, zIndex: 10 }}>
                {storeCategories.map(cat => {
                    const isSel = activeCategory === cat.id;
                    const name = cat.id === 'all' ? 'HOME' : cat.name.toUpperCase();
                    return (
                        <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{ background: isSel ? NEON : SURF, border: `1px solid ${NEON}`, color: isSel ? 'black' : NEON, padding: '8px 20px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '900', cursor: 'pointer', transition: '0.3s', boxShadow: isSel ? `0 0 10px ${NEON}` : 'none' }}>
                            {name}
                        </button>
                    );
                })}
            </div>

            <div className="grid" style={{ padding: '30px 20px' }}>
                {displayProducts.map(p => (
                    <ProductCard key={p.id} product={p} />
                ))}
            </div>

            {currentUser?.id === storeOwner?.id && !isGuestView && (
                <button onClick={() => setIsEditingStore(!isEditingStore)} style={{ position: 'fixed', bottom: '110px', left: '20px', background: NEON, color: 'black', border: 'none', padding: '12px 25px', borderRadius: '8px', fontWeight: '900', fontSize: '0.7rem', boxShadow: `0 0 15px ${NEON}`, cursor: 'pointer', zIndex: 100 }}>
                    {isEditingStore ? 'EXIT_SYS' : 'EDIT_MODE'}
                </button>
            )}
            {isEditingStore && currentUser?.id === storeOwner?.id && (
                <div style={{ position: 'fixed', bottom: '160px', left: '20px', width: '320px', background: SURF, border: `2px solid ${NEON}`, borderRadius: '12px', padding: '25px', zIndex: 100, boxShadow: `0 0 30px ${NEON}33` }}>
                    <h2 style={{ color: NEON, fontSize: '1rem', marginBottom: '20px' }}>SYSTEM SETTINGS</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <input type="text" defaultValue={storeName} onBlur={async (e) => { const v = e.target.value.trim(); if (v) await setDoc(doc(db, 'users', currentUser!.id), { ...currentUser, storeName: v }, { merge: true }); }} style={{ background: DARK, border: `1px solid ${NEON}`, color: NEON, padding: '10px', outline: 'none' }} />
                        <textarea defaultValue={storeBio} onBlur={async (e) => { await setDoc(doc(db, 'users', currentUser!.id), { ...currentUser, storeBio: e.target.value.trim() }, { merge: true }); }} style={{ background: DARK, border: `1px solid ${NEON}`, color: 'white', padding: '10px', outline: 'none', resize: 'none', height: '60px' }} />
                    </div>
                </div>
            )}
            {renderThemeSelector()}
        </div>
    );
};
