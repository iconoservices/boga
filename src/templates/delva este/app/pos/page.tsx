'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { useRouter } from 'next/navigation';
import SalesManager from '@/components/admin/sections/SalesManager';

export default function PosPage() {
    const {
        products, currentUser, updateProductStock, confirmAction,
        globalColors, selectedStoreId, setSelectedStoreId
    } = useApp();
    
    const router = useRouter();

    // Loading state
    if (!currentUser) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
                <p style={{ opacity: 0.4, fontSize: '0.9rem', fontWeight: 600 }}>Cargando Caja...</p>
            </div>
        );
    }

    const { role, id, parentStoreId } = currentUser;
    const isMaster = role === 'master';
    const isSocio = role === 'socio';

    // Sync context store ID if missing
    useEffect(() => {
        if (!selectedStoreId && id) setSelectedStoreId(id);
    }, [id, selectedStoreId]);

    // Calcular effectiveStoreId y productos (misma lógica que AdminDashboardView)
    const effectiveStoreId = isMaster ? selectedStoreId : (parentStoreId || id);
    const storeProducts = products.filter(p => p.userId === effectiveStoreId || (effectiveStoreId === 'master' && !p.userId));

    return (
        <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: '10px 15px 100px' }}>
            {/* Header Standalone POS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '12px 20px', borderRadius: '20px', marginBottom: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button 
                        onClick={() => router.push('/admin')} 
                        style={{ width: '36px', height: '36px', borderRadius: '12px', border: '1px solid #eee', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}
                    >
                        ⬅️
                    </button>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary)' }}>Caja Rápida ⚡</h1>
                        <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: '#888', fontWeight: 700 }}>Terminal de Venta Independiente</p>
                    </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ textAlign: 'right', display: 'none', '@media (min-width: 600px)': { display: 'block' } } as any}>
                        <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: '#333' }}>{currentUser.name}</p>
                        <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'capitalize' }}>{role}</p>
                    </div>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.9rem' }}>
                        {currentUser.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                </div>
            </div>

            {/* Contenido POS */}
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <SalesManager
                    storeProducts={storeProducts}
                    effectiveStoreId={effectiveStoreId}
                    updateProductStock={updateProductStock}
                    confirmAction={confirmAction}
                    globalColors={globalColors || []}
                    isMaster={isMaster}
                    isSocio={isSocio}
                />
            </div>
        </div>
    );
}
