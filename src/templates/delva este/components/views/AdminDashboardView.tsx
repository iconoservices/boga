import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/data/products';
import { type User } from '@/lib/types';
import { useApp } from '@/lib/context/AppContext';

// Modular Sections
import InventoryManager from '@/components/admin/sections/InventoryManager';
import BrandingSettings from '@/components/admin/sections/BrandingSettings';
import TeamManager from '@/components/admin/sections/TeamManager';
import MasterPanel from '@/components/admin/sections/MasterPanel';
import FinancialDashboard from '@/components/admin/sections/FinancialDashboard';

interface AdminDashboardViewProps {
    currentUser: User;
    products: Product[];
    users: User[];
    exportDB: () => void;
    globalBrandName: string;
    setGlobalBrandName: (val: string) => void;
    globalPrimaryColor: string;
    setGlobalPrimaryColor: (val: string) => void;
    globalFont: string;
    setGlobalFont: (val: string) => void;
    globalWaNumber: string;
    setGlobalWaNumber: (val: string) => void;
    globalGridCols: number;
    setGlobalGridCols: (val: number) => void;
    globalLogo: string;
    setGlobalLogo: (v: string) => void;
    globalFavicon: string;
    setGlobalFavicon: (v: string) => void;
    globalMetaDesc: string;
    setGlobalMetaDesc: (val: string) => void;
    globalKeywords: string;
    setGlobalKeywords: (val: string) => void;
    globalSocialLinks: any;
    setGlobalSocialLinks: (val: any) => void;
    globalTags: string[];
    setGlobalTags: (val: string[]) => void;
    globalCategories: { id: string, name: string, subCategories?: any[] }[];
    setGlobalCategories: (val: { id: string, name: string, subCategories?: { id: string, name: string }[] }[]) => void;
    globalColors: { name: string, hex: string }[];
    saveGlobalColors: (colors: { name: string, hex: string }[]) => Promise<void>;
    handleLogoUpload: (e: any) => void;
    handleFaviconUpload: (e: any) => void;
    saveSettings: () => void;
    saveGlobalCategories: (newCats: any[]) => Promise<void>;
    updateProductStock: (id: string, delta: number) => Promise<void>;
    assignSKUToProduct: (id: string, sku: string) => Promise<void>;
    generateSuggestedSKU: (categoryId: string, title: string, color?: string, subCategoryId?: string) => string;
    deleteProduct: (id: string) => Promise<void>;
    compressImage: (file: File) => Promise<string>;
    setEditingProduct: (p: Product | null) => void;
    SOCIAL_ICONS: any;
    logout: () => void;
    confirmAction: (title: string, message: string, onConfirm: () => void, confirmText?: string, cancelText?: string) => void;
    alertAction: (title: string, message: string) => void;
    onRecordSale: (p: Product) => void;
    isSynced: boolean;
    authEmail: string | null;
    banners: any[];
}

const AdminDashboardView: React.FC<AdminDashboardViewProps> = (props) => {
    const {
        currentUser, products, users, exportDB, SOCIAL_ICONS, logout, confirmAction, alertAction,
        onRecordSale, banners, isSynced, authEmail
    } = props;
    const { selectedStoreId, setSelectedStoreId } = useApp();
    const router = useRouter();

    // 1. DETERMINAR EL NIVEL DE ACCESO
    const role = currentUser.role || 'customer';
    const isMaster = role === 'master';
    const isSocio = role === 'socio';
    const isColaborador = role === 'colaborador';
    const isCustomer = role === 'customer';

    const [activeTab, setActiveTabBase] = useState<'inventory' | 'metrics' | 'branding' | 'team' | 'master_panel' | 'config'>(
        'inventory'
    );

    // Sync tab with URL
    const setActiveTab = (tab: any) => {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tab);
        window.history.replaceState({}, '', url);
        setActiveTabBase(tab);
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab && ['inventory', 'metrics', 'branding', 'team', 'master_panel', 'config'].includes(tab)) {
            setActiveTabBase(tab as any);
        }
    }, []);

    // 3. BLOQUEO DINÁMICO DE RUTAS
    useEffect(() => {
        if (!isMaster && (activeTab === 'master_panel' || activeTab === 'config')) {
            setActiveTab('inventory');
        }
    }, [activeTab, isMaster]);

    // Sync context store ID if missing
    useEffect(() => {
        if (!selectedStoreId && currentUser.id) setSelectedStoreId(currentUser.id);
    }, [currentUser.id, selectedStoreId]);

    // --- RECOPILACIÓN DE PRODUCTOS ---
    const effectiveStoreId = (isMaster && activeTab !== 'master_panel') ? selectedStoreId : (currentUser.parentStoreId || currentUser.id);
    const storeProducts = products.filter(p => p.userId === effectiveStoreId || (effectiveStoreId === 'master' && !p.userId));

    // --- VISTA LEVEL 4: CUSTOMER (UPSELL) ---
    if (isCustomer) {
        return (
            <div className="container fade-in" style={{ padding: '60px 20px 40px', textAlign: 'center', minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: 'white', padding: '50px 30px 40px', borderRadius: '40px', boxShadow: 'var(--shadow-lg)', maxWidth: '520px', width: '100%', border: '1px solid #f0f0f0' }}>
                    <span style={{ fontSize: '3.5rem', marginBottom: '15px', display: 'block' }}>🏪</span>
                    <h2 style={{ fontSize: '1.9rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '12px' }}>¡Crea tu propia tienda!</h2>
                    <p style={{ fontSize: '1rem', opacity: 0.65, marginBottom: '30px', lineHeight: 1.7 }}>
                        Esta función es exclusiva para <b>Socios DELVA</b>.<br />
                        Sube productos, personaliza tu marca y llega a miles de clientes en la selva.
                    </p>
                    <button onClick={() => window.open(`https://wa.me/${props.globalWaNumber}?text=Hola,%20soy%20${currentUser.name}%20y%20quiero%20abrir%20mi%20tienda%20en%20DELVA`, '_blank')} className="btn-vibrant" style={{ width: '100%', padding: '18px', borderRadius: '22px', fontSize: '1rem', marginBottom: '12px' }}>PEDIR ACCESO DE SOCIO 🚀</button>
                    <button onClick={() => router.push('/')} style={{ width: '100%', padding: '14px', background: 'transparent', color: 'var(--primary)', border: '1.5px solid rgba(15,48,37,0.15)', borderRadius: '18px', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem' }}>Volver al Marketplace 🌿</button>
                </div>
                <button onClick={logout} style={{ marginTop: '24px', background: 'transparent', color: 'rgba(0,0,0,0.28)', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '0.78rem' }}>Cerrar sesión</button>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            {/* COMPACT DASHBOARD HEADER */}
            <section style={{ background: 'var(--primary)', borderRadius: '24px', padding: '10px 16px', margin: '8px 0', color: 'white', boxShadow: 'var(--shadow-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflowX: 'auto' }}>
                    {/* Logo & Connection Status */}
                    <div style={{ flexShrink: 0 }}>
                        <h2 style={{ fontSize: '0.95rem', fontWeight: 900, margin: 0, whiteSpace: 'nowrap' }}>Panel Delva 🌿</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isSynced ? '#00ff00' : '#ff4d4f', boxShadow: isSynced ? '0 0 5px #00ff00' : 'none' }} />
                            <p style={{ fontSize: '0.6rem', margin: 0, opacity: 0.8, whiteSpace: 'nowrap' }}>
                                {authEmail || 'Sin Conexión Real'}
                            </p>
                        </div>
                    </div>

                    {/* TABS (center, only when not on master panel) */}
                    {activeTab !== 'master_panel' && (
                        <div style={{ display: 'flex', gap: '4px', flex: 1, background: 'rgba(255,255,255,0.06)', padding: '4px', borderRadius: '14px', overflowX: 'auto' }}>
                            <button onClick={() => setActiveTab('inventory')} style={{ flex: 1, padding: '7px 10px', borderRadius: '11px', border: 'none', background: activeTab === 'inventory' ? 'white' : 'transparent', color: activeTab === 'inventory' ? 'var(--primary)' : 'white', fontWeight: 900, fontSize: '0.65rem', whiteSpace: 'nowrap', cursor: 'pointer' }}>PRODUCTOS</button>
                            <button onClick={() => router.push('/pos')} style={{ flex: 1, padding: '7px 10px', borderRadius: '11px', border: 'none', background: 'transparent', color: 'white', fontWeight: 900, fontSize: '0.65rem', whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.15s' }}>💰 CAJA RÁPIDA ⚡</button>
                            <button onClick={() => setActiveTab('metrics')} style={{ flex: 1, padding: '7px 10px', borderRadius: '11px', border: 'none', background: activeTab === 'metrics' ? 'white' : 'transparent', color: activeTab === 'metrics' ? 'var(--primary)' : 'white', fontWeight: 900, fontSize: '0.65rem', whiteSpace: 'nowrap', cursor: 'pointer' }}>📈 MÉTRICAS</button>
                            <button onClick={() => setActiveTab('branding')} style={{ flex: 1, padding: '7px 10px', borderRadius: '11px', border: 'none', background: activeTab === 'branding' ? 'white' : 'transparent', color: activeTab === 'branding' ? 'var(--primary)' : 'white', fontWeight: 900, fontSize: '0.65rem', whiteSpace: 'nowrap', cursor: 'pointer' }}>🎨 BRANDING</button>
                            <button onClick={() => setActiveTab('team')} style={{ flex: 1, padding: '7px 10px', borderRadius: '11px', border: 'none', background: activeTab === 'team' ? 'white' : 'transparent', color: activeTab === 'team' ? 'var(--primary)' : 'white', fontWeight: 900, fontSize: '0.65rem', whiteSpace: 'nowrap', cursor: 'pointer' }}>👥 EQUIPO</button>
                            {isMaster && (
                                <button onClick={() => setActiveTab('config')} style={{ flex: 1, padding: '7px 10px', borderRadius: '11px', border: 'none', background: activeTab === 'config' ? 'white' : 'transparent', color: activeTab === 'config' ? 'var(--primary)' : 'white', fontWeight: 900, fontSize: '0.65rem', whiteSpace: 'nowrap', cursor: 'pointer' }}>⚙️ CONFIG</button>
                            )}
                        </div>
                    )}

                    {/* Action buttons (right) */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                        {isMaster && (
                            <button
                                onClick={() => setActiveTab(activeTab === 'master_panel' ? 'inventory' : 'master_panel')}
                                style={{ background: activeTab === 'master_panel' ? 'var(--accent)' : 'rgba(255,255,255,0.1)', color: activeTab === 'master_panel' ? 'var(--primary)' : 'white', border: 'none', padding: '8px 14px', borderRadius: '30px', fontWeight: 900, fontSize: '0.65rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                                {activeTab === 'master_panel' ? '📊 GESTIÓN' : '👑 MASTER'}
                            </button>
                        )}
                        <button onClick={logout} style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 14px', borderRadius: '30px', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>Salir 🚪</button>
                    </div>
                </div>
            </section>

            {/* CONTENIDO MODULAR */}
            <main className="fade-in">


                {activeTab === 'inventory' && (
                    <InventoryManager 
                        effectiveStoreId={effectiveStoreId} 
                        storeProducts={storeProducts} 
                        setEditingProduct={props.setEditingProduct}
                        globalCategories={props.globalCategories}
                        saveGlobalCategories={props.saveGlobalCategories}
                        updateProductStock={props.updateProductStock}
                        assignSKUToProduct={props.assignSKUToProduct}
                        generateSuggestedSKU={props.generateSuggestedSKU}
                        confirmAction={confirmAction}
                        onRecordSale={props.onRecordSale}
                        deleteProduct={props.deleteProduct}
                        globalColors={props.globalColors}
                        saveGlobalColors={props.saveGlobalColors}
                        isMaster={isMaster}
                        isSocio={isSocio}
                    />
                )}


                {activeTab === 'branding' && (
                    <BrandingSettings 
                        {...props}
                        effectiveStoreId={effectiveStoreId}
                        users={users}
                        products={products}
                        isMaster={isMaster}
                        isColaborador={isColaborador}
                        isSocio={isSocio}
                    />
                )}

                {activeTab === 'team' && (
                    <TeamManager 
                        effectiveStoreId={effectiveStoreId}
                        users={users}
                        isColaborador={isColaborador}
                        confirmAction={confirmAction}
                    />
                )}

                {activeTab === 'metrics' && (
                    <FinancialDashboard
                        storeProducts={storeProducts}
                        effectiveStoreId={effectiveStoreId}
                        isMaster={isMaster}
                        isSocio={isSocio}
                    />
                )}

                {activeTab === 'config' && (
                    <div style={{ display: 'grid', gap: '25px' }}>
                        <div style={{ background: 'white', padding: '30px', borderRadius: '35px', border: '1px solid #f0f0f0' }}>
                           <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '20px' }}>Cerebro del Marketplace (Master) ⚙️</h3>
                           <div style={{ display: 'grid', gap: '15px' }}>
                               <div><label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#888' }}>NOMBRE DEL SITIO</label><input value={props.globalBrandName} onChange={e => props.setGlobalBrandName(e.target.value)} onBlur={props.saveSettings} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #eee' }} /></div>
                               <div><label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#888' }}>WHATSAPP MASTER</label><input value={props.globalWaNumber} onChange={e => props.setGlobalWaNumber(e.target.value)} onBlur={props.saveSettings} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #eee' }} /></div>
                               <div><label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#888' }}>DESCRIPCIÓN SEO</label><textarea value={props.globalMetaDesc} onChange={e => props.setGlobalMetaDesc(e.target.value)} onBlur={props.saveSettings} rows={3} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #eee', resize: 'vertical' }} /></div>
                           </div>
                        </div>
                        <div style={{ background: 'white', padding: '30px', borderRadius: '35px', border: '1px solid #f0f0f0', textAlign: 'center' }}>
                            <span style={{ fontSize: '2.5rem' }}>📱</span>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, marginTop: '10px' }}>PWA Ready</h3>
                            <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>Manifest.json detectado. El marketplace ya es instalable.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'master_panel' && (
                    <MasterPanel 
                        users={users}
                        products={products}
                        globalCategories={props.globalCategories}
                        setActiveTab={setActiveTab}
                        setSelectedStoreId={setSelectedStoreId}
                        selectedStoreId={selectedStoreId}
                        setEditingProduct={props.setEditingProduct}
                    />
                )}
            </main>
        </div>
    );
};

export default AdminDashboardView;
