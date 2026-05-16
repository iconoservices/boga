'use client';

import { useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product } from '@/lib/data/products';
import { type User } from '@/lib/types';
import { STORE_THEMES, THEME_DEFAULTS } from '@/lib/data/themes';

// Theme Layouts
import { SelvaEleganteLayout } from '@/components/shop/themes/SelvaEleganteLayout';
import { TechNeonLayout } from '@/components/shop/themes/TechNeonLayout';
import { FastFoodLayout } from '@/components/shop/themes/FastFoodLayout';
import { SupermarketLayout } from '@/components/shop/themes/SupermarketLayout';
import { HomeDecorLayout } from '@/components/shop/themes/HomeDecorLayout';
import { LuxGoldLayout } from '@/components/shop/themes/LuxGoldLayout';
import { DefaultShopLayout } from '@/components/shop/themes/DefaultShopLayout';

interface ShopViewProps {
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    activeCategory: string;
    setActiveCategory: (val: string) => void;
    globalCategories: { id: string, name: string }[];
    products: Product[]; 
    users: User[]; 
    currentUser: User | null;
    onRecordSale?: (p: Product) => void;
    setEditingProduct: (p: any) => void;
    globalSocialLinks: any;
    SOCIAL_ICONS: any;
    compressImage?: (file: File) => Promise<string>;
    confirmAction: (title: string, message: string, onConfirm: () => void, confirmText?: string, cancelText?: string) => void;
    alertAction: (title: string, message: string) => void;
    getWhatsAppLink: (p: Product, color?: string) => string;
    addToCart: (product: Product, color?: string) => void;
    globalBrandName: string;
}

const ShopView: React.FC<ShopViewProps> = ({
    searchTerm,
    setSearchTerm,
    compressImage,
    alertAction,
    setEditingProduct,
    globalSocialLinks,
    SOCIAL_ICONS,
    confirmAction,
    getWhatsAppLink,
    products,
    users,
    globalCategories,
    currentUser,
    activeCategory,
    setActiveCategory,
    addToCart,
    onRecordSale,
    globalBrandName
}) => {
    const {
        isLoading,
        banners,
    } = useApp();

    const searchParams = useSearchParams();
    const query = searchParams;
    const shopId = query.get('u') || currentUser?.id;
    const isMainAdminId = shopId === 'master' || shopId === 'admin';
    const isMarketplace = !query.get('u') || query.get('u') === 'master';
    const isGuestView = !!query.get('viewAsGuest');

    // --- ADDITIONAL THEME STATES ---
    const [isEditingStore, setIsEditingStore] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newTag, setNewTag] = useState('');
    const [activeColor, setActiveColor] = useState<string>('');
    const [activeGlobalFilter, setActiveGlobalFilter] = useState<'all' | 'offers' | 'reservations' | 'new'>('all');

    useEffect(() => {
        const catParam = query.get('cat');
        if (catParam) setActiveCategory(catParam);
    }, [searchParams, setActiveCategory]);

    // --- HANDLERS ---
    const saveCats = async (cats: { id: string, name: string }[]) => {
        if (!currentUser || !shopId) return;
        await setDoc(doc(db, 'users', shopId), { storeCategories: cats }, { merge: true });
    };

    const saveTags = async (tags: string[]) => {
        if (!currentUser || !shopId) return;
        await setDoc(doc(db, 'users', shopId), { storeTags: tags }, { merge: true });
    };

    const toggleDefaultCat = async (catId: string) => {
        if (!storeOwner || !shopId) return;
        const current = storeOwner.disabledDefaultCategories || [];
        const updated = current.includes(catId) 
            ? current.filter((id: string) => id !== catId)
            : [...current, catId];
        await setDoc(doc(db, 'users', shopId), { disabledDefaultCategories: updated }, { merge: true });
    };

    if (isLoading) {
        return (
            <div className="container" style={{ padding: '100px 20px', textAlign: 'center', background: 'var(--bg)', minHeight: '100vh' }}>
                <div className="skeleton" style={{ width: '100px', height: '100px', borderRadius: '50%', margin: '0 auto 20px' }}></div>
                <div className="skeleton" style={{ width: '200px', height: '30px', margin: '0 auto 10px' }}></div>
                <div className="skeleton" style={{ width: '300px', height: '15px', margin: '0 auto 40px' }}></div>
            </div>
        );
    }

    const storeOwner = isMarketplace ? undefined : users.find(u => u.id === shopId);
    
    // Fallback if specific store owner not found
    if (!isMarketplace && !storeOwner && users.length > 0) {
        return (
            <div style={{ padding: '100px 20px', textAlign: 'center' }}>
                <h2>Tienda no encontrada</h2>
                <p>El enlace que seguiste no parece ser válido.</p>
            </div>
        );
    }
    
    const storeName = isMarketplace ? "Marketplace DELVA" : (storeOwner?.storeName || storeOwner?.name || "Tienda");
    const storeLogo = isMarketplace ? null : (storeOwner?.storeLogo || storeOwner?.photoURL || null);
    const storeBanner = isMarketplace ? null : (storeOwner?.storeBanner || null);
    const storeBio = isMarketplace 
        ? "Explora todos los productos de la comunidad Selva Elegante." 
        : (storeOwner?.storeBio || "Bienvenidos a nuestra tienda oficial.");

    const activeTheme = isMarketplace 
        ? { id: 'market', primary: '#1B4332' } 
        : (STORE_THEMES.find((t: any) => t.id === (storeOwner?.themeId || 'organic-handmade')) || STORE_THEMES[0]);
    
    const themeDefaults = isMarketplace ? null : THEME_DEFAULTS[activeTheme.id || ''];
    const disabledCats = storeOwner?.disabledDefaultCategories || [];

    let storeCategories: { id: string; name: string }[];
    if (isMarketplace) {
        storeCategories = globalCategories;
    } else if (storeOwner?.storeCategories?.length) {
        storeCategories = [{ id: 'all', name: 'Todo' }, ...storeOwner.storeCategories];
    } else if (themeDefaults) {
        const active = themeDefaults.categories.filter((c: any) => !disabledCats.includes(c.id));
        storeCategories = [{ id: 'all', name: 'Todo' }, ...active];
    } else {
        storeCategories = globalCategories;
    }

    // Determine which products to show
    const storeProducts = isMarketplace ? products : products.filter((p: Product) => (p as any).userId === shopId || (isMainAdminId && !(p as any).userId));
    
    // Extract available colors for filtering
    const availableColors = Array.from(new Set(storeProducts.flatMap(p => p.colors || [])));

    const displayProducts = storeProducts.filter((p: Product) => {
        const matchesCat = activeCategory === 'all' || p.categoryId === activeCategory;
        const matchesSearch = !searchTerm || 
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesColor = !activeColor || (p.colors || []).includes(activeColor);
        return matchesCat && matchesSearch && matchesColor;
    });

    const renderThemeSelector = () => {
        if (currentUser?.id !== storeOwner?.id || isMarketplace) return null;
        return (
            <div style={{ 
                position: 'fixed', 
                right: '25px', 
                top: '90px', 
                zIndex: 9999,
                background: 'white',
                padding: '12px',
                borderRadius: '20px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                border: '1px solid #eee',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 950, color: 'var(--primary)', letterSpacing: '0.5px' }}>🎨 CAMBIAR DISEÑO</span>
                <select 
                    value={activeTheme.id}
                    onChange={async (e) => {
                        await setDoc(doc(db, 'users', currentUser!.id), { themeId: e.target.value }, { merge: true });
                    }}
                    style={{ 
                        padding: '8px 12px', 
                        borderRadius: '12px', 
                        border: '2px solid #eee', 
                        background: '#f9f9f9', 
                        fontWeight: 800, 
                        fontSize: '0.8rem', 
                        cursor: 'pointer',
                        outline: 'none'
                    }}
                >
                    <option value="selva-elegante">✨ Selva Elegante</option>
                    {STORE_THEMES.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </div>
        );
    };

    // --- THEME ROUTER ---
    const layoutProps = {
        storeName, storeLogo, storeBio, storeBanner, storeOwner, currentUser,
        isGuestView, storeProducts, isEditingStore, setIsEditingStore,
        compressImage: compressImage || (async (f: File) => ""), usersLength: users.length, globalSocialLinks, SOCIAL_ICONS,
        saveCats, saveTags, toggleDefaultCat,
        newCatName, setNewCatName, newTag, setNewTag,
        storeTags: storeOwner?.storeTags || [],
        storeCategories, activeCategory, setActiveCategory,
        availableColors, activeColor, setActiveColor,
        displayProducts, renderThemeSelector, setEditingProduct,
        globalCategories, alertAction, searchTerm, setSearchTerm,
        themeDefaults, disabledCats, addToCart, onRecordSale, onQuickAdd: addToCart,
        isMarketplace, confirmAction, getWhatsAppLink,
        banners, activeGlobalFilter, setActiveGlobalFilter
    };

    if (isMarketplace || activeTheme.id === 'selva-elegante') {
        return <SelvaEleganteLayout {...layoutProps} />;
    }

    switch (activeTheme.id) {
        case 'tech-neon': return <TechNeonLayout {...layoutProps} />;
        case 'fast-food': return <FastFoodLayout {...layoutProps} />;
        case 'supermarket': return <SupermarketLayout {...layoutProps} />;
        case 'home-decor': return <HomeDecorLayout {...layoutProps} />;
        case 'lux-gold': return <LuxGoldLayout {...layoutProps} />;
        default: return <DefaultShopLayout {...layoutProps} />;
    }
};

export default ShopView;
