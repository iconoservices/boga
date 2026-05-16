'use client';

import React from 'react';
import GrandHeroCarousel from './GrandHeroCarousel';
import { useRouter } from 'next/navigation';

interface MarketplaceHeaderProps {
    categories: { id: string, name: string }[];
    activeCategory: string;
    setActiveCategory: (val: string) => void;
    banners?: any[];
    globalBrandName?: string;
    searchTerm?: string;
    setSearchTerm?: (val: string) => void;
    activeGlobalFilter?: string;
    setActiveGlobalFilter?: (val: any) => void;
}

export const MarketplaceHeader: React.FC<MarketplaceHeaderProps> = ({
    categories,
    activeCategory,
    setActiveCategory,
    banners,
    searchTerm = '',
    setSearchTerm = () => {},
    activeGlobalFilter = 'all',
    setActiveGlobalFilter = () => {}
}) => {
    const router = useRouter();
    const [isDesktop, setIsDesktop] = React.useState(false);
    const [hasMounted, setHasMounted] = React.useState(false);

    React.useEffect(() => {
        setHasMounted(true);
        const checkSize = () => setIsDesktop(window.innerWidth > 1024);
        checkSize();
        window.addEventListener('resize', checkSize);
        return () => window.removeEventListener('resize', checkSize);
    }, []);

    return (
        <div className="marketplace-header" style={{ background: 'transparent' }}>
            {/* HERO CAROUSEL */}
            <section style={{ marginBottom: '0px' }}>
                <GrandHeroCarousel onCtaClick={(link) => router.push(link)} banners={banners} />
            </section>

            {/* SEARCH & CATEGORY CONTAINER */}
            <div className="content-shell" style={{ maxWidth: '1400px', margin: '0 auto', marginTop: '-20px', position: 'relative', zIndex: 50 }}>
                
                {/* SEARCH BAR */}
                <div style={{ padding: '0 20px', marginBottom: '8px' }}>
                    <div style={{ 
                        background: 'white', 
                        borderRadius: '20px', 
                        padding: '6px 20px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                        border: '1px solid rgba(0,0,0,0.03)'
                    }}>
                        <span style={{ fontSize: '1.2rem' }}>🔍</span>
                        <input 
                            type="text" 
                            placeholder="Buscar en Delva Marketplace..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ 
                                flex: 1, 
                                border: 'none', 
                                outline: 'none', 
                                fontSize: '0.95rem', 
                                fontWeight: 600,
                                color: '#1a1a1a',
                                background: 'transparent',
                                padding: 0,
                                margin: 0,
                                lineHeight: 1
                            }}
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 900 }}
                            >✕</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
