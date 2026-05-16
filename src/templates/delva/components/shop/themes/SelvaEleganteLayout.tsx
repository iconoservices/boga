import React from 'react';
import { MarketplaceHeader } from '../../common/MarketplaceHeader';
import { MarketplaceSidebar } from '../../common/MarketplaceSidebar';
import { ShortcutRibbon } from '../../common/ShortcutRibbon';
import { CategoryMenu } from '../../common/CategoryMenu';
import ProductCard from '../../common/ProductCard';
import type { Product } from '@/lib/data/products';
import { type User } from '@/lib/types';

interface SelvaEleganteLayoutProps {
    storeName: string;
    storeLogo: string | null;
    storeBio: string;
    activeCategory: string;
    setActiveCategory: (val: string) => void;
    storeCategories: { id: string, name: string }[];
    displayProducts: Product[];
    availableColors?: string[];
    activeColor?: string;
    setActiveColor?: (val: string) => void;
    users?: User[];
    onQuickAdd?: (p: Product) => void;
    renderThemeSelector: () => React.ReactNode;
    isMarketplace?: boolean;
    // --- Marketplace Props ---
    banners?: any[];
    searchTerm?: string;
    setSearchTerm?: (val: string) => void;
    activeGlobalFilter?: any;
    setActiveGlobalFilter?: (val: any) => void;
}

export const SelvaEleganteLayout: React.FC<SelvaEleganteLayoutProps> = ({
    storeName,
    storeLogo,
    storeBio,
    activeCategory,
    setActiveCategory,
    storeCategories,
    displayProducts,
    availableColors = [],
    activeColor = '',
    setActiveColor = () => {},
    onQuickAdd,
    renderThemeSelector,
    isMarketplace,
    banners = [],
    searchTerm = '',
    setSearchTerm = () => {},
    activeGlobalFilter = 'all',
    setActiveGlobalFilter = () => {}
}) => {
    const [isDesktop, setIsDesktop] = React.useState(false);

    React.useEffect(() => {
        const checkSize = () => setIsDesktop(window.innerWidth > 1024);
        checkSize();
        window.addEventListener('resize', checkSize);
        return () => window.removeEventListener('resize', checkSize);
    }, []);

    const handleCategoryChange = (catId: string) => {
        setActiveCategory(catId);
    };

    return (
        <div style={{ background: '#F8F9FA', minHeight: '100vh', paddingBottom: '120px', fontFamily: "'Outfit', sans-serif" }}>
            {renderThemeSelector()}

            {/* UNIFIED MARKETPLACE HEADER (If in Marketplace mode) */}
            {isMarketplace ? (
                <MarketplaceHeader 
                    categories={storeCategories}
                    activeCategory={activeCategory}
                    setActiveCategory={setActiveCategory}
                    banners={banners}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    activeGlobalFilter={activeGlobalFilter}
                    setActiveGlobalFilter={setActiveGlobalFilter}
                />
            ) : (
                /* COMPACT & PRO HEADER (For individual shops) */
                storeName !== 'Marketplace DELVA' && (
                    <header style={{ 
                        background: 'white', 
                        padding: '20px 20px 40px', 
                        textAlign: 'center',
                        borderRadius: '0 0 40px 40px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                        borderBottom: '1px solid rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '15px' }}>
                            {storeLogo ? (
                                <div style={{ width: '45px', height: '45px', borderRadius: '15px', overflow: 'hidden', border: '1px solid #eee' }}>
                                    <img src={storeLogo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="logo" />
                                </div>
                            ) : <span style={{ fontSize: '1.5rem' }}>🌿</span>}
                            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--selva-green, #1B4332)', margin: 0, fontFamily: "'Montserrat', sans-serif" }}>{storeName}</h1>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#666', maxWidth: '300px', margin: '0 auto', lineHeight: 1.4 }}>{storeBio}</p>
                    </header>
                )
            )}

            <div 
                className="main-layout" 
                style={{ 
                    display: 'flex', 
                    gap: isDesktop ? '40px' : '0px', 
                    maxWidth: '1400px', 
                    margin: '0 auto', 
                    padding: isDesktop ? '0 20px' : '0'
                }}
            >
                {/* 🛠️ SIDEBAR (PC Only) */}
                {isDesktop && (
                    <MarketplaceSidebar 
                        activeGlobalFilter={activeGlobalFilter}
                        setActiveGlobalFilter={setActiveGlobalFilter}
                        globalCategories={storeCategories}
                        localActiveCat={activeCategory}
                        handleCategoryChange={handleCategoryChange}
                        availableColors={availableColors}
                        activeColor={activeColor}
                        setActiveColor={setActiveColor}
                    />
                )}

                <main style={{ flex: 1, minWidth: 0, paddingBottom: '60px' }}>
                    
                    {/* 🚀 QUICK ACTION RIBBON (Mobile Only) */}
                    {!isDesktop && (
                        <ShortcutRibbon 
                            activeGlobalFilter={activeGlobalFilter}
                            setActiveGlobalFilter={setActiveGlobalFilter}
                        />
                    )}

                    {/* CATEGORY PILLS (Mobile/Tablet Only) - Only show if NOT in marketplace mode to avoid double-header categories */}
                    {!isDesktop && !isMarketplace && (
                        <div style={{ margin: '0 -20px 5px', padding: '0 10px' }}>
                            <CategoryMenu 
                                categories={storeCategories}
                                activeCategory={activeCategory}
                                setActiveCategory={setActiveCategory}
                            />
                        </div>
                    )}

                    {/* COLOR FILTER BAR (Mobile Only) */}
                    {!isDesktop && availableColors.length > 0 && (
                        <div style={{ 
                            marginTop: '5px', 
                            padding: '0 20px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px' 
                        }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 950, color: '#aaa', letterSpacing: '1px' }}>COLORES:</span>
                            <div style={{ 
                                display: 'flex', 
                                gap: '8px', 
                                overflowX: 'auto', 
                                padding: '4px 0',
                                scrollbarWidth: 'none',
                                flex: 1
                            }}>
                                {activeColor && (
                                    <button onClick={() => setActiveColor('')} style={{ background: 'white', border: '1px solid #ddd', borderRadius: '12px', padding: '4px 10px', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}>Todos ✕</button>
                                )}
                                {availableColors.map(c => (
                                    <button 
                                        key={c}
                                        onClick={() => setActiveColor(activeColor === c ? '' : c)}
                                        style={{ 
                                            width: '28px', height: '28px', borderRadius: '50%', background: c, 
                                            border: activeColor === c ? '3px solid var(--primary, #1B4332)' : '2px solid white', 
                                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s', transform: activeColor === c ? 'scale(1.1)' : 'scale(1)'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* CATALOG GRID */}
                    <div style={{ marginTop: isDesktop ? '15px' : '30px', padding: '0 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: isDesktop ? '1.25rem' : '1.1rem', fontWeight: 900, color: '#1a1a1a' }}>
                                {isMarketplace ? 'Resultados de Búsqueda' : 'Explorar Productos'}
                            </h3>
                        </div>

                        {displayProducts.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.4 }}>
                                <p>No hay productos en esta sección.</p>
                            </div>
                        ) : (
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: `repeat(auto-fill, minmax(${isDesktop ? '180px' : '140px'}, 1fr))`, 
                                gap: isDesktop ? '20px' : '12px' 
                            }}>
                                {displayProducts.map(p => (
                                    <div key={p.id}>
                                        <ProductCard product={p} onQuickAdd={onQuickAdd} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

