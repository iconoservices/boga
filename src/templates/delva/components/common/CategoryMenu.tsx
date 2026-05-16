import React from 'react';

interface CategoryMenuProps {
    categories: { id: string, name: string }[];
    activeCategory: string;
    setActiveCategory: (val: string) => void;
    variant?: 'pills' | 'sidebar';
}

export const CategoryMenu: React.FC<CategoryMenuProps> = ({ 
    categories, 
    activeCategory, 
    setActiveCategory,
    variant = 'pills'
}) => {
    const isSidebar = variant === 'sidebar';

    return (
        <div style={{ 
            overflowX: isSidebar ? 'hidden' : 'auto', 
            whiteSpace: isSidebar ? 'normal' : 'nowrap', 
            padding: isSidebar ? '5px 0' : '10px 20px', 
            display: 'flex', 
            flexDirection: isSidebar ? 'column' : 'row',
            gap: isSidebar ? '6px' : '12px',
            scrollbarWidth: 'none',
            background: 'transparent',
            width: '100%'
        }}>
            {categories.map(cat => {
                const style = {
                    bg: (cat as any).color ? `${(cat as any).color}15` : '#f8f8f8',
                    icon: (cat as any).icon || '',
                    color: (cat as any).color || '#555'
                };
                const isSel = activeCategory === cat.id;

                return (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={isSidebar ? 'sidebar-cat-btn' : 'pro-pill'}
                        style={{
                            background: isSel ? style.color : (isSidebar ? 'transparent' : style.bg),
                            color: isSel ? 'white' : (isSidebar ? '#444' : style.color),
                            boxShadow: isSel ? `0 8px 15px ${style.color}33` : 'none',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: isSidebar ? 'flex-start' : 'center',
                            gap: '10px',
                            padding: isSidebar ? '10px 15px' : '8px 18px',
                            borderRadius: isSidebar ? '12px' : '15px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontWeight: isSel ? 900 : (isSidebar ? 600 : 700),
                            fontSize: isSidebar ? '0.85rem' : '0.8rem',
                            textAlign: 'left'
                        }}
                    >
                        {(cat.id === 'all' || style.icon) && (
                            <span style={{ fontSize: isSidebar ? '1.1rem' : '1rem', opacity: isSel ? 1 : 0.7 }}>
                                {cat.id === 'all' ? '🏷️' : style.icon}
                            </span>
                        )}
                        <span style={{ flex: 1 }}>{cat.name}</span>
                        {isSidebar && isSel && <span style={{ fontSize: '0.8rem' }}>●</span>}
                    </button>
                );
            })}
        </div>
    );
};
