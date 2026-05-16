import React from 'react';
import { CategoryMenu } from './CategoryMenu';

interface MarketplaceSidebarProps {
    activeGlobalFilter: string;
    setActiveGlobalFilter: (id: any) => void;
    globalCategories: any[];
    localActiveCat: string;
    handleCategoryChange: (id: string) => void;
    availableColors: string[];
    activeColor: string;
    setActiveColor: (color: string) => void;
}

export const MarketplaceSidebar: React.FC<MarketplaceSidebarProps> = ({
    activeGlobalFilter,
    setActiveGlobalFilter,
    globalCategories,
    localActiveCat,
    handleCategoryChange,
    availableColors,
    activeColor,
    setActiveColor
}) => {
    return (
        <aside style={{
            width: '260px',
            flexShrink: 0,
            position: 'sticky',
            top: '120px',
            height: 'fit-content',
            paddingTop: '14px',
            paddingBottom: '40px'
        }}>
            {/* ── ACTION SHORTCUTS (Horizontal Row in Sidebar) ── */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '20px',
                padding: '0 4px'
            }}>
                {[
                    { id: 'all', label: 'Inicio', icon: '🏠', color: '#6C4AB6', bg: '#F2EBFF' },
                    { id: 'offers', label: 'Promos', icon: '🔥', color: '#E91E63', bg: '#FFF0F5', badge: '¡D!' },
                    { id: 'reservations', label: 'Res.', icon: '🗓️', color: '#F39C12', bg: '#FFF8F0' },
                    { id: 'new', label: 'Nov.', icon: '✨', color: '#00A651', bg: '#F1F9F5', badge: 'New' }
                ].map((btn: any) => {
                    const isSel = activeGlobalFilter === btn.id;
                    return (
                        <button
                            key={btn.id}
                            onClick={() => {
                                setActiveGlobalFilter(btn.id);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                flex: 1,
                                position: 'relative'
                            }}
                        >
                            <div style={{
                                width: '46px',
                                height: '46px',
                                background: isSel ? 'white' : btn.bg,
                                borderRadius: '15px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                                transition: '0.2s',
                                boxShadow: isSel ? `0 8px 15px ${btn.color}33` : 'none',
                                border: isSel ? `2px solid ${btn.color}` : '1px solid transparent'
                            }}>
                                {btn.icon}
                            </div>
                            <span style={{
                                fontSize: '0.65rem',
                                fontWeight: isSel ? 950 : 700,
                                color: isSel ? btn.color : '#666'
                            }}>{btn.label}</span>

                            {btn.badge && !isSel && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-5px',
                                    right: '-2px',
                                    background: btn.color,
                                    color: 'white',
                                    fontSize: '0.5rem',
                                    padding: '2px 4px',
                                    borderRadius: '6px',
                                    fontWeight: 900
                                }}>{btn.badge}</div>
                            )}
                        </button>
                    );
                })}
            </div>

            <div style={{ height: '1px', background: '#eee', margin: '15px 0' }} />

            {/* ── CATEGORIES ── */}
            <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.7rem', fontWeight: 950, color: '#aaa', marginLeft: '15px', marginBottom: '10px', letterSpacing: '2px', textTransform: 'uppercase' }}>EXPLORAR POR</h4>
                <CategoryMenu
                    variant="sidebar"
                    categories={[{ id: 'all', name: 'Todo' }, ...globalCategories.filter(c => c.id !== 'all' && c.name !== 'Todos' && c.name !== 'Todo')]}
                    activeCategory={localActiveCat}
                    setActiveCategory={handleCategoryChange}
                />
            </div>

            <div style={{ height: '1px', background: '#eee', margin: '20px 0' }} />

            {/* ── COLORS ── */}
            {availableColors.length > 0 && (
                <div style={{ marginBottom: '35px', padding: '0 15px' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 950, color: '#aaa', marginBottom: '15px', letterSpacing: '1px' }}>FILTRAR POR COLOR</h4>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {activeColor && (
                            <button onClick={() => setActiveColor('')} style={{ background: '#f0f0f0', border: 'none', borderRadius: '10px', padding: '5px 12px', fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer' }}>Limpiar ✕</button>
                        )}
                        {availableColors.map(c => (
                            <button
                                key={c}
                                onClick={() => setActiveColor(activeColor === c ? '' : c)}
                                style={{
                                    width: '26px', height: '26px', borderRadius: '50%', background: c,
                                    border: activeColor === c ? '3px solid var(--primary)' : '2px solid #eee',
                                    cursor: 'pointer', transition: '0.2s',
                                    transform: activeColor === c ? 'scale(1.1)' : 'scale(1)',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Sidebar Info Card */}
            <div style={{ background: '#f9f9f9', borderRadius: '20px', padding: '20px', border: '1px solid #eee', margin: '0 10px' }}>
                <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 900, marginBottom: '12px' }}>🎯 Filtros Pro</h4>
                    <p style={{ fontSize: '0.75rem', color: '#666', lineHeight: 1.5 }}>
                        Estas viendo la selección inteligente de Delva para hoy.
                    </p>
                </div>
                <div style={{ opacity: 0.3 }}>
                    <h5 style={{ fontSize: '0.7rem', fontWeight: 800, color: '#999', margin: 0 }}>ORDENAR POR (Próximamente)</h5>
                </div>
            </div>
        </aside>
    );
};
