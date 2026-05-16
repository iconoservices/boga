import React from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product } from '@/lib/data/products';
import { type User } from '@/lib/types';
import { STORE_THEMES } from '@/lib/data/themes';
import ProductCard from '../../common/ProductCard';

interface DefaultShopLayoutProps {
    storeName: string;
    storeLogo: string | null;
    storeBio: string;
    storeBanner: string | null;
    storeOwner: User | undefined;
    currentUser: User | null;
    isGuestView: boolean;
    storeProducts: Product[];
    isEditingStore: boolean;
    setIsEditingStore: (val: boolean) => void;
    compressImage: (file: File) => Promise<string>;
    usersLength: number;
    globalSocialLinks: any;
    SOCIAL_ICONS: any;
    saveCats: (cats: { id: string; name: string }[]) => Promise<void>;
    saveTags: (tags: string[]) => Promise<void>;
    newCatName: string;
    setNewCatName: (val: string) => void;
    newTag: string;
    setNewTag: (val: string) => void;
    storeTags: string[];
    storeCategories: { id: string; name: string }[];
    activeCategory: string;
    setActiveCategory: (id: string) => void;
    displayProducts: Product[];
    renderThemeSelector: () => React.ReactNode;
    setEditingProduct: (product: any) => void;
    globalCategories: { id: string; name: string }[];
    alertAction: (title: string, message: string) => void;
}

export const DefaultShopLayout: React.FC<DefaultShopLayoutProps> = ({
    storeName,
    storeLogo,
    storeBio,
    storeBanner,
    storeOwner,
    currentUser,
    isGuestView,
    storeProducts,
    isEditingStore,
    setIsEditingStore,
    compressImage,
    usersLength,
    globalSocialLinks,
    SOCIAL_ICONS,
    saveCats,
    saveTags,
    newCatName,
    setNewCatName,
    newTag,
    setNewTag,
    storeTags,
    storeCategories,
    activeCategory,
    setActiveCategory,
    displayProducts,
    renderThemeSelector,
    setEditingProduct,
    globalCategories,
    alertAction
}) => {
    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            {/* STOREFRONT HEADER - FB STYLE */}
            <div style={{ position: 'relative', marginBottom: '40px', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', border: '1px solid rgba(0,0,0,0.05)' }}>
                {/* BANNER PORTADA */}
                <div className={usersLength === 0 ? 'skeleton' : ''} style={{ width: '100%', height: '220px', background: 'var(--primary)', position: 'relative' }}>
                    <img src={storeBanner || 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1200&q=80'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Portada de la tienda" />
                </div>

                <div style={{ padding: '0 30px 30px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    {/* AVATAR OVERLAP */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '-40px' }}>
                        <div className={usersLength === 0 ? 'skeleton' : ''} style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '2.5rem', overflow: 'hidden', border: '5px solid var(--surface)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', position: 'relative', zIndex: 10 }}>
                            {storeLogo ? <img src={storeLogo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (storeOwner?.initials || 'D')}
                        </div>

                        {/* SOCIAL LINKS */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '55px' }}>
                            {SOCIAL_ICONS && Object.keys(SOCIAL_ICONS).map(net => (
                                globalSocialLinks && globalSocialLinks[net] && (
                                    <a key={net} href={globalSocialLinks[net]} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', opacity: 0.6, fontSize: '1.2rem', padding: '5px' }}>
                                        {SOCIAL_ICONS[net]}
                                    </a>
                                )
                            ))}
                        </div>
                    </div>

                    {/* STORE INFO & STATS */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px', marginTop: '15px' }}>
                        <div style={{ flex: '1 1 300px' }}>
                            <h1 className={usersLength === 0 ? 'skeleton' : ''} style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase', margin: '0 0 5px 0' }}>{storeName}</h1>
                            <p className={usersLength === 0 ? 'skeleton' : ''} style={{ opacity: 0.7, fontSize: '0.9rem', maxWidth: '600px', margin: 0, lineHeight: 1.5 }}>{storeBio}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '25px', background: 'var(--bg)', padding: '15px 25px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0,0,0,0.03)' }}>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem', margin: 0 }}>{storeProducts.length}</p>
                                <p style={{ fontSize: '0.65rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', margin: 0 }}>Productos</p>
                            </div>
                            <div style={{ width: '1px', background: 'rgba(0,0,0,0.05)' }}></div>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem', margin: 0 }}>5.0 ⭐</p>
                                <p style={{ fontSize: '0.65rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', margin: 0 }}>Valoración</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* EDIT STORE TOGGLE & PANEL */}
            {currentUser?.id === storeOwner?.id && !isGuestView && (
                <button
                    onClick={() => setIsEditingStore(!isEditingStore)}
                    style={{ marginBottom: '30px', background: isEditingStore ? 'var(--surface)' : 'var(--primary)', color: isEditingStore ? 'var(--primary)' : 'white', border: `2px solid var(--primary)`, padding: '10px 20px', borderRadius: '30px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', transition: '0.3s' }}
                >
                    {isEditingStore ? 'Cerrar Ajustes' : '⚙️ Personalizar Tienda'}
                </button>
            )}

            {isEditingStore && currentUser?.id === storeOwner?.id && !isGuestView && (
                <div style={{ marginBottom: '40px', padding: '25px', background: 'var(--surface)', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)', textAlign: 'left', boxShadow: 'var(--shadow-md)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '20px' }}>🎨 Ajustes de tu Tienda</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                            {/* LOGO SUBIDA */}
                            <div style={{ background: 'var(--bg)', padding: '15px', borderRadius: '15px', display: 'flex', gap: '15px', alignItems: 'center', border: '1px solid rgba(0,0,0,0.05)' }}>
                                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', color: 'white', fontWeight: 800 }}>
                                    {storeLogo ? <img src={storeLogo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (storeOwner?.initials || 'D')}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <p style={{ fontSize: '0.7rem', fontWeight: 800, margin: '0 0 5px 0' }}>Foto de Perfil</p>
                                    <button
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file'; input.accept = 'image/*';
                                            input.onchange = async (e: any) => {
                                                if (e.target.files[0]) {
                                                    const compressed = await compressImage(e.target.files[0]);
                                                    await setDoc(doc(db, 'users', currentUser!.id), { ...currentUser, storeLogo: compressed }, { merge: true });
                                                }
                                            };
                                            input.click();
                                        }}
                                        style={{ background: 'none', border: 'none', color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', padding: 0, textAlign: 'left' }}
                                    >
                                        Subir nueva
                                    </button>
                                </div>
                            </div>

                            {/* BANNER SUBIDA */}
                            <div style={{ background: 'var(--bg)', padding: '15px', borderRadius: '15px', display: 'flex', gap: '15px', alignItems: 'center', border: '1px solid rgba(0,0,0,0.05)' }}>
                                <div style={{ width: '80px', height: '50px', borderRadius: '10px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', color: 'white', fontWeight: 800 }}>
                                    {storeBanner ? <img src={storeBanner} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🖼️'}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <p style={{ fontSize: '0.7rem', fontWeight: 800, margin: '0 0 5px 0' }}>Banner Portada</p>
                                    <button
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file'; input.accept = 'image/*';
                                            input.onchange = async (e: any) => {
                                                if (e.target.files[0]) {
                                                    const compressed = await compressImage(e.target.files[0]);
                                                    await setDoc(doc(db, 'users', currentUser!.id), { ...currentUser, storeBanner: compressed }, { merge: true });
                                                }
                                            };
                                            input.click();
                                        }}
                                        style={{ background: 'none', border: 'none', color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', padding: 0, textAlign: 'left' }}
                                    >
                                        Subir nuevo
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* NOMBRE Y BIO */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>Nombre de la Tienda</label>
                                <input
                                    type="text"
                                    defaultValue={storeName}
                                    onBlur={async (e) => {
                                        const val = e.target.value.trim();
                                        if (val) await setDoc(doc(db, 'users', currentUser!.id), { ...currentUser, storeName: val }, { merge: true });
                                    }}
                                    style={{ padding: '12px 15px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: 'var(--bg)', fontSize: '0.9rem', outline: 'none' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>Descripción / Bio</label>
                                <textarea
                                    defaultValue={storeBio}
                                    onBlur={async (e) => {
                                        await setDoc(doc(db, 'users', currentUser!.id), { ...currentUser, storeBio: e.target.value.trim() }, { merge: true });
                                    }}
                                    style={{ padding: '12px 15px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: 'var(--bg)', fontSize: '0.85rem', outline: 'none', resize: 'none', height: '46px' }}
                                />
                            </div>
                        </div>

                        {/* CATEGORIAS EDITOR */}
                        <div style={{ background: 'var(--bg)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(0,0,0,0.05)' }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '15px' }}>🏷️ Gestionar Categorías</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px' }}>
                                {(storeOwner?.storeCategories || []).map((cat: { id: string; name: string }, i: number) => (
                                    <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface)', border: '1px solid var(--primary)', borderRadius: '30px', padding: '5px 15px' }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)' }}>{cat.name}</span>
                                        <button
                                            onClick={async () => {
                                                const updated = (storeOwner?.storeCategories || []).filter((_: { id: string; name: string }, j: number) => i !== j);
                                                await saveCats(updated);
                                            }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'red', fontWeight: 'bold' }}
                                        >✕</button>
                                    </div>
                                ))}
                                {(!storeOwner?.storeCategories || storeOwner?.storeCategories.length === 0) && (
                                    <p style={{ fontSize: '0.7rem', opacity: 0.5 }}>No has definido categorías personalizadas.</p>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    value={newCatName}
                                    onChange={e => setNewCatName(e.target.value)}
                                    placeholder="Nombre de la nueva categoría..."
                                    style={{ flex: 1, padding: '10px 15px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.8rem' }}
                                />
                                <button
                                    onClick={async () => {
                                        if (newCatName.trim()) {
                                            const id = newCatName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                                            const updated = [...(storeOwner?.storeCategories || []), { id, name: newCatName.trim() }];
                                            await saveCats(updated);
                                            setNewCatName('');
                                        }
                                    }}
                                    style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0 20px', borderRadius: '10px', fontWeight: 800, fontSize: '0.75rem' }}
                                >
                                    Añadir
                                </button>
                            </div>
                        </div>

                        {/* TAGS EDITOR */}
                        <div style={{ background: 'var(--bg)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(0,0,0,0.05)' }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '15px' }}>🔖 Gestionar Etiquetas</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px' }}>
                                {storeTags.map((tag: string, i: number) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--primary)', borderRadius: '30px', padding: '5px 15px' }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'white' }}>#{tag}</span>
                                        <button
                                            onClick={async () => {
                                                const updated = storeTags.filter((_: string, j: number) => i !== j);
                                                await saveTags(updated);
                                            }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}
                                        >✕</button>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    value={newTag}
                                    onChange={e => setNewTag(e.target.value)}
                                    placeholder="Nueva etiqueta (ej: oferta)..."
                                    style={{ flex: 1, padding: '10px 15px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.8rem' }}
                                />
                                <button
                                    onClick={async () => {
                                        if (newTag.trim()) {
                                            const updated = [...storeTags, newTag.trim().toLowerCase()];
                                            await saveTags(updated);
                                            setNewTag('');
                                        }
                                    }}
                                    style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0 20px', borderRadius: '10px', fontWeight: 800, fontSize: '0.75rem' }}
                                >
                                    Añadir
                                </button>
                            </div>
                        </div>

                        {/* ACCIONES Y BOTONES */}
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => setEditingProduct({ title: '', price: '', categoryId: globalCategories[1]?.id || 'varios', image: '', gallery: [], colors: [], tags: [] })}
                                style={{ flex: 1, minWidth: '150px', background: 'var(--primary)', color: 'white', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                            >
                                ➕ Añadir Producto
                            </button>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/tienda?u=${currentUser!.id}`);
                                    alertAction('¡Link copiado!', 'El link de tu tienda ha sido copiado al portapapeles.');
                                }}
                                style={{ flex: 1, minWidth: '150px', background: 'var(--bg)', color: 'var(--primary)', border: '2px solid var(--primary)', padding: '15px', borderRadius: '15px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
                            >
                                🔗 Copiar Link de Tienda
                            </button>
                            <button
                                onClick={() => window.open(`${window.location.origin}/tienda?u=${currentUser!.id}&viewAsGuest=true`, '_blank')}
                                style={{ flex: 1, minWidth: '150px', background: 'var(--bg)', color: 'var(--primary)', border: '2px solid var(--primary)', padding: '15px', borderRadius: '15px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
                            >
                                👀 Ver como cliente
                            </button>
                        </div>

                        {/* CUSTOM COLORS */}
                         <div style={{ background: 'var(--bg)', borderRadius: '15px', padding: '15px', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '12px', color: 'var(--primary)' }}>🖌️ Colores Personalizados</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
                                {[
                                    { key: 'customPrimary', label: 'Color Principal', defaultVal: storeOwner?.customPrimary || STORE_THEMES.find(t => t.id === (storeOwner?.themeId || 'organic-handmade'))?.primary || '#6d4c41' },
                                    { key: 'customBg', label: 'Fondo General', defaultVal: storeOwner?.customBg || STORE_THEMES.find(t => t.id === (storeOwner?.themeId || 'organic-handmade'))?.bg || '#ffffff' },
                                    { key: 'customSurface', label: 'Fondo de Tarjetas', defaultVal: storeOwner?.customSurface || STORE_THEMES.find(t => t.id === (storeOwner?.themeId || 'organic-handmade'))?.surface || '#fffaf0' },
                                ].map((item: { key: string; label: string; defaultVal: string }) => (
                                    <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface)', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                                        <input
                                            type="color"
                                            defaultValue={item.defaultVal}
                                            onChange={async (e) => {
                                                await setDoc(doc(db, 'users', currentUser!.id), { ...currentUser, [item.key]: e.target.value }, { merge: true });
                                            }}
                                            style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', cursor: 'pointer', padding: 0 }}
                                        />
                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, lineHeight: 1.2 }}>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SEPARADOR CATEGORIAS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid rgba(0,0,0,0.03)', paddingBottom: '15px' }}>
                    <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '5px', flex: 1 }} className="hide-scrollbar">
                        <button
                            onClick={() => setActiveCategory('all')}
                            style={{
                                whiteSpace: 'nowrap', padding: '8px 20px', borderRadius: '30px', border: 'none', cursor: 'pointer',
                                background: activeCategory === 'all' ? 'var(--primary)' : 'transparent',
                                color: activeCategory === 'all' ? 'white' : 'var(--primary)',
                                fontWeight: 800, fontSize: '0.8rem', transition: '0.3s'
                            }}
                        >
                            Todo
                        </button>
                        {storeCategories.map((cat: { id: string; name: string }) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                style={{
                                    whiteSpace: 'nowrap', padding: '8px 20px', borderRadius: '30px', border: 'none', cursor: 'pointer',
                                    background: activeCategory === cat.id ? 'var(--primary)' : 'transparent',
                                    color: activeCategory === cat.id ? 'white' : 'var(--primary)',
                                    fontWeight: 800, fontSize: '0.8rem', transition: '0.3s'
                                }}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* PRODUCT GRID */}
                <div className="grid">
                    {displayProducts.map((p: Product) => (
                        <ProductCard key={p.id} product={p} />
                    ))}
                </div>

                {displayProducts.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px', opacity: 0.4 }}>
                        <p style={{ fontSize: '3rem', margin: '0 0 10px 0' }}>📦</p>
                        <p style={{ fontSize: '1rem', fontWeight: 700 }}>No hay productos coincidentes.</p>
                    </div>
                )}
            </div>
            {renderThemeSelector()}
        </div>
    );
};
