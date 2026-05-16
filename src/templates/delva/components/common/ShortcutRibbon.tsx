import React from 'react';

interface ShortcutRibbonProps {
    activeGlobalFilter: string;
    setActiveGlobalFilter: (id: any) => void;
}

export const ShortcutRibbon: React.FC<ShortcutRibbonProps> = ({
    activeGlobalFilter,
    setActiveGlobalFilter
}) => {
    const shortcuts = [
        { id: 'all', label: 'Inicio', icon: '🏠', color: '#6C4AB6', bg: '#F2EBFF' },
        { id: 'offers', label: 'Promos', icon: '🔥', color: '#E91E63', bg: '#FFF0F5', badge: '¡Dscto!' },
        { id: 'reservations', label: 'Reserva', icon: '🗓️', color: '#F39C12', bg: '#FFF8F0' },
        { id: 'new', label: 'Novedad', icon: '✨', color: '#00A651', bg: '#F1F9F5', badge: 'Nuevo' }
    ];

    return (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-start', 
            alignItems: 'center',
            gap: '14px', 
            marginBottom: '0px',
            padding: '5px 0',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            maxWidth: '100%'
        }}>
            {shortcuts.map((btn: any) => {
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
                            padding: '4px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            textAlign: 'center',
                            minWidth: '70px',
                            position: 'relative'
                        }}
                    >
                        {/* ICON CIRCLE */}
                        <div style={{
                            width: '52px',
                            height: '52px',
                            background: btn.bg,
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.4rem',
                            transition: 'all 0.3s',
                            boxShadow: isSel ? `0 8px 15px ${btn.color}22` : '0 4px 10px rgba(0,0,0,0.03)',
                            border: isSel ? `2.5px solid ${btn.color}` : '2px solid transparent',
                            transform: isSel ? 'scale(1.04)' : 'scale(1)'
                         }}>
                            {btn.icon}
                        </div>
                        
                        {/* BADGE (¡Dscto / Nuevo) */}
                        {btn.badge && (
                            <span style={{ 
                                position: 'absolute',
                                top: '-4px',
                                right: '-3px',
                                fontSize: '0.6rem', 
                                fontWeight: 950, 
                                color: 'white',
                                background: btn.color,
                                padding: '2px 7px',
                                borderRadius: '8px',
                                boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                whiteSpace: 'nowrap',
                                zIndex: 1,
                                letterSpacing: '0.4px'
                            }}>
                                {btn.badge}
                            </span>
                        )}

                        {/* LABEL */}
                        <span style={{ 
                            fontSize: '0.78rem', 
                            fontWeight: isSel ? 900 : 700,
                            color: isSel ? btn.color : '#4F4F4F',
                            fontFamily: "'Outfit', sans-serif"
                        }}>
                            {btn.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};
