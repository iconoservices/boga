import React, { useState } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/lib/types';
import type { Product } from '@/lib/data/products';
import LockedSection from './LockedSection';

interface BrandingSettingsProps {
    effectiveStoreId: string;
    users: User[];
    products: Product[];
    isSocio: boolean;
    isMaster: boolean;
    isColaborador: boolean;
    compressImage: (file: File) => Promise<string>;
    banners: any[];
    confirmAction: (title: string, message: string, onConfirm: () => void, confirmText?: string, cancelText?: string) => void;
    globalBrandName: string;
    setGlobalBrandName: (v: string) => void;
    globalWaNumber: string;
    setGlobalWaNumber: (v: string) => void;
    globalMetaDesc: string;
    setGlobalMetaDesc: (v: string) => void;
    globalCategories: any[];
    setGlobalCategories: (v: any[]) => void;
    saveGlobalCategories: (newCats: any[]) => Promise<void>;
    saveSettings: () => void;
}

const BrandingSettings: React.FC<BrandingSettingsProps> = (props) => {
    const { 
        effectiveStoreId, users, isColaborador, compressImage, isMaster,
        banners, confirmAction
    } = props;

    const [subTab, setSubTab] = useState<'identity' | 'banners' | 'categories' | 'advanced'>('identity');
    const store = users.find(u => u.id === effectiveStoreId);

    // --- CATEGORIES INLINE EDITING ---


    // --- IDENTITY LOGIC ---
    const uploadImage = async (field: string) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
            if (e.target.files[0]) {
                const compressed = await compressImage(e.target.files[0]);
                await setDoc(doc(db, 'users', effectiveStoreId), { [field]: compressed }, { merge: true });
            }
        };
        input.click();
    };

    const saveField = async (field: string, value: string) => {
        await setDoc(doc(db, 'users', effectiveStoreId), { [field]: value }, { merge: true });
    };

    // --- BANNERS LOGIC ---
    const [editingBanner, setEditingBanner] = useState<any>(null);
    const [bannerForm, setBannerForm] = useState({ image: '', tag: '', title: '', subtitle: '', cta: '', ctaLink: '', accent: '#00a651' });

    const handleBannerImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const base64 = await compressImage(file);
        setBannerForm(prev => ({ ...prev, image: base64 }));
    };

    const saveBanner = async () => {
        if (!bannerForm.image || !bannerForm.title) { alert("Imagen y título son obligatorios"); return; }
        try {
            const id = editingBanner?.id || Math.random().toString(36).substring(2, 9);
            await setDoc(doc(db, 'banners', id), { ...bannerForm, id });
            setEditingBanner(null);
            setBannerForm({ image: '', tag: '', title: '', subtitle: '', cta: '', ctaLink: '', accent: '#00a651' });
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="fade-in">
            {/* SUB-TABS NAVIGATION */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '25px', background: '#f5f5f5', padding: '5px', borderRadius: '18px', overflowX: 'auto' }}>
                <button onClick={() => setSubTab('identity')} style={{ ...subTabBtn, background: subTab === 'identity' ? 'white' : 'transparent', color: subTab === 'identity' ? 'var(--primary)' : '#888', boxShadow: subTab === 'identity' ? 'var(--shadow-sm)' : 'none' }}>🎨 IDENTIDAD</button>
                <button onClick={() => setSubTab('banners')} style={{ ...subTabBtn, background: subTab === 'banners' ? 'white' : 'transparent', color: subTab === 'banners' ? 'var(--primary)' : '#888', boxShadow: subTab === 'banners' ? 'var(--shadow-sm)' : 'none' }}>🖼️ BANNERS</button>
                <button onClick={() => setSubTab('advanced')} style={{ ...subTabBtn, background: subTab === 'advanced' ? 'white' : 'transparent', color: subTab === 'advanced' ? 'var(--primary)' : '#888', boxShadow: subTab === 'advanced' ? 'var(--shadow-sm)' : 'none' }}>⚙️ AVANZADO</button>
            </div>

            <main>
                {/* ── IDENTITY TAB ── */}
                {subTab === 'identity' && (
                    <div style={{ display: 'grid', gap: '20px' }}>
                        <LockedSection title="🎨 Apariencia Visual" isLocked={isColaborador}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label style={labelStyle}>BANNER DE PORTADA</label>
                                    <div onClick={() => uploadImage('storeBanner')} style={{ width: '100%', height: '120px', borderRadius: '16px', background: store?.storeBanner ? `url(${store.storeBanner}) center/cover` : '#f5f5f5', border: '2px dashed #ddd', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                                        {!store?.storeBanner ? <span style={{ color: '#bbb', fontSize: '0.85rem', fontWeight: 700 }}>+ Subir banner (1500×400px)</span> : <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: 'white', fontWeight: 800, fontSize: '0.8rem' }}>✏️ Cambiar banner</span></div>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: '140px' }}><label style={labelStyle}>LOGO DELVA</label><div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}><div style={{ width: '70px', height: '70px', borderRadius: '16px', background: '#f5f5f5', overflow: 'hidden', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{store?.storeLogo ? <img src={store.storeLogo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="logo" /> : <span style={{ fontSize: '1.8rem', opacity: 0.2 }}>🏪</span>}</div><button onClick={() => uploadImage('storeLogo')} style={uploadBtn}>Subir logo</button></div></div>
                                    <div style={{ flex: 1, minWidth: '140px' }}><label style={labelStyle}>FOTO DE PERFIL</label><div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}><div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#f5f5f5', overflow: 'hidden', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{store?.photoURL ? <img src={store.photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="perfil" /> : <span style={{ fontSize: '1.8rem', opacity: 0.2 }}>👤</span>}</div><button onClick={() => uploadImage('photoURL')} style={uploadBtn}>Subir foto</button></div></div>
                                </div>
                                <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '16px', border: '1px solid #eee' }}>
                                    <label style={labelStyle}>🎨 TEMA VISUAL GLOBAL</label>
                                    <select value={store?.themeId || 'organic-handmade'} onChange={e => saveField('themeId', e.target.value)} style={{ ...inputStyle, background: 'white', fontWeight: 800 }}>
                                        <option value="selva-elegante">✨ Selva Elegante (Premium)</option>
                                        <option value="fashion-minimal">👗 Moda & Estilo</option>
                                        <option value="organic-handmade">🌿 Artesanal & Natural</option>
                                        <option value="supermarket">🛒 Supermercado Online</option>
                                        <option value="lux-gold">✨ Boutique Exclusiva</option>
                                        <option value="fast-food">🍗 Broaster & Grill</option>
                                    </select>
                                </div>
                            </div>
                        </LockedSection>
                        <LockedSection title="📋 Información de Marca" isLocked={isColaborador}>
                            <div style={{ display: 'grid', gap: '18px' }}>
                                <div><label style={labelStyle}>NOMBRE DE MARCA / STORE</label><input type="text" defaultValue={store?.storeName || ''} onBlur={e => saveField('storeName', e.target.value)} style={inputStyle} /></div>
                                <div><label style={labelStyle}>DESCRIPCIÓN / BIO</label><textarea defaultValue={store?.storeBio || ''} onBlur={e => saveField('storeBio', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></div>
                            </div>
                        </LockedSection>
                    </div>
                )}

                {/* ── BANNERS TAB ── */}
                {subTab === 'banners' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0 }}>Publicidad de Inicio</h3>
                            {!editingBanner && <button onClick={() => setEditingBanner({ id: null })} style={{ ...uploadBtn, padding: '10px 20px' }}>+ NUEVO ANUNCIO</button>}
                        </div>

                        {editingBanner ? (
                            <div style={{ background: 'white', padding: '25px', borderRadius: '24px', border: '1px solid #eee' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                                    <div>
                                        <label style={labelStyle}>IMAGEN (Sugerido 1500x500)</label>
                                        <div onClick={() => document.getElementById('b-up')?.click()} style={{ width: '100%', height: '140px', background: '#f5f5f5', borderRadius: '15px', overflow: 'hidden', border: '2px dashed #ddd', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {bannerForm.image ? <img src={bannerForm.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ opacity: 0.3 }}>🖼️ Subir</span>}
                                        </div>
                                        <input id="b-up" type="file" hidden accept="image/*" onChange={handleBannerImage} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <input placeholder="Título principal" value={bannerForm.title} onChange={e => setBannerForm({...bannerForm, title: e.target.value})} style={inputStyle} />
                                        <input placeholder="Subtítulo corto" value={bannerForm.subtitle} onChange={e => setBannerForm({...bannerForm, subtitle: e.target.value})} style={inputStyle} />
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <input placeholder="Botón (CTA)" value={bannerForm.cta} onChange={e => setBannerForm({...bannerForm, cta: e.target.value})} style={inputStyle} />
                                            <input type="color" value={bannerForm.accent} onChange={e => setBannerForm({...bannerForm, accent: e.target.value})} style={{ width: '50px', height: '45px', padding: '2px', borderRadius: '10px', border: '1px solid #ddd' }} />
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                    <button onClick={saveBanner} style={{ ...uploadBtn, flex: 1 }}>{editingBanner.id ? 'ACTUALIZAR' : 'CREAR'}</button>
                                    <button onClick={() => setEditingBanner(null)} style={{ background: '#eee', border: 'none', padding: '12px 20px', borderRadius: '15px', fontWeight: 800 }}>CANCELAR</button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                                {banners.map(b => (
                                    <div key={b.id} style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', border: '1px solid #eee' }}>
                                        <div style={{ height: '100px', background: `url(${b.image}) center/cover` }} />
                                        <div style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>{b.title}</span>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <button onClick={() => { setEditingBanner(b); setBannerForm(b); }} style={{ background: '#f5f5f5', border: 'none', padding: '5px', borderRadius: '8px' }}>✏️</button>
                                                <button onClick={() => confirmAction("Eliminar", "Borrar banner?", async () => await deleteDoc(doc(db, 'banners', b.id)))} style={{ background: '#fff0f0', border: 'none', padding: '5px', borderRadius: '8px' }}>🗑️</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}




                {/* ── ADVANCED TAB ── */}
                {subTab === 'advanced' && (
                    <div style={{ display: 'grid', gap: '20px' }}>
                        <LockedSection title="⚙️ Configuración Global" isLocked={!isMaster}>
                            <div style={{ display: 'grid', gap: '15px' }}>
                                <div><label style={labelStyle}>NOMBRE PÚBLICO DEL MARKETPLACE</label><input value={props.globalBrandName} onChange={e => props.setGlobalBrandName(e.target.value)} onBlur={props.saveSettings} style={inputStyle} /></div>
                                <div><label style={labelStyle}>WHATSAPP DE CONTACTO (GLOBAL)</label><input value={props.globalWaNumber} onChange={e => props.setGlobalWaNumber(e.target.value)} onBlur={props.saveSettings} style={inputStyle} /></div>
                                <div><label style={labelStyle}>DESCRIPCIÓN SEO (META DESCRIPTION)</label><textarea value={props.globalMetaDesc} onChange={e => props.setGlobalMetaDesc(e.target.value)} onBlur={props.saveSettings} rows={3} style={inputStyle} /></div>
                            </div>
                        </LockedSection>
                        <LockedSection title="🔗 Redes Sociales" isLocked={isColaborador}>
                            <div style={{ display: 'grid', gap: '14px' }}>
                                {['instagram', 'tiktok', 'facebook'].map(r => (
                                    <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ flex: 1 }}><label style={labelStyle}>{r.toUpperCase()}</label><input type="text" defaultValue={(store as any)?.[r] || ''} onBlur={e => saveField(r, e.target.value)} style={inputStyle} /></div></div>
                                ))}
                            </div>
                        </LockedSection>
                    </div>
                )}
            </main>

            <p style={{ fontSize: '0.65rem', color: '#bbb', textAlign: 'center', marginTop: '30px' }}>⚠️ Algunos ajustes solo pueden ser modificados por el Admin Master.</p>
        </div>
    );
};

// Styles
const labelStyle: React.CSSProperties = { fontSize: '0.7rem', fontWeight: 900, color: '#888', textTransform: 'uppercase', marginBottom: '7px', display: 'block' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 15px', borderRadius: '13px', border: '1.5px solid #eee', fontFamily: '"Outfit", sans-serif', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' };
const uploadBtn: React.CSSProperties = { background: 'var(--primary)', color: 'white', padding: '9px 18px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, border: 'none', cursor: 'pointer' };
const subTabBtn: React.CSSProperties = { flex: 1, padding: '10px', borderRadius: '14px', border: 'none', fontWeight: 900, fontSize: '0.65rem', cursor: 'pointer', transition: '0.3s' };

export default BrandingSettings;

