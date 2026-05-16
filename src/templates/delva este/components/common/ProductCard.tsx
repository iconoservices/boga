import React from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/data/products';
import type { User } from '@/lib/types';
import ColorSwatch from './ColorSwatch';

interface ProductCardProps {
    product: Product;
    onQuickAdd?: (p: Product) => void;
    users?: User[]; // Optional users list to find author
}

const ProductCard: React.FC<ProductCardProps> = React.memo(({ product, onQuickAdd, users }) => {
    const router = useRouter();
    const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);

    const images = React.useMemo(() => {
        const arr = [product.image, ...(product.gallery || [])].filter(url => typeof url === 'string' && url.trim().length > 5);
        return arr.length > 0 ? arr : ['https://via.placeholder.com/300?text=No+Image'];
    }, [product.image, product.gallery]);

    // Index tracking for hover cycling
    React.useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (hoverIndex !== null && images.length > 1) {
            timeout = setTimeout(() => {
                setHoverIndex((hoverIndex + 1) % images.length);
            }, 1200);
        }
        return () => clearTimeout(timeout);
    }, [hoverIndex, images.length]);

    const handleQuickAdd = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onQuickAdd) onQuickAdd(product);
    };

    // 🚀 SOCIAL PROOF LOGIC (Deterministic & Realistic)
    const seed = product.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const approval = 94 + (seed % 6);

    const isOutOfStock = (Number(product.stock) || 0) <= 0;

    return (
        <div 
            className="pro-card" 
            onClick={() => router.push(`/producto/${product.slug || product.id}`)}
            onMouseEnter={() => images.length > 1 ? setHoverIndex(1) : setHoverIndex(0)}
            onMouseLeave={() => setHoverIndex(null)}
            style={{ 
                opacity: isOutOfStock ? 0.9 : 1,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                flex: 1
            }}
        >
            <div style={{ 
                position: 'relative', 
                overflow: 'hidden', 
                aspectRatio: '1/1', 
                background: '#f5f5f5',
                filter: isOutOfStock ? 'brightness(0.95)' : 'none',
                transition: 'filter 0.3s',
                flexShrink: 0
            }}>
                {images.map((imgSrc, i) => (
                    <img 
                        key={i}
                        src={imgSrc} 
                        loading="lazy" 
                        style={{ 
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover',
                            opacity: (hoverIndex !== null ? hoverIndex : 0) === i ? 1 : 0,
                            transition: 'opacity 0.4s ease-in-out'
                        }} 
                        alt={`${product.title} - ${i}`}
                    />
                ))}

                {images.length > 1 && hoverIndex !== null && (
                    <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', height: '3px', background: 'rgba(255,255,255,0.3)', display: 'flex', zIndex: 5 }}>
                        {images.map((_, i) => (
                            <div key={i} style={{ flex: 1, height: '100%', background: i === hoverIndex ? 'var(--primary)' : 'transparent', transition: '0.3s' }} />
                        ))}
                    </div>
                )}

                {isOutOfStock ? (
                    <div style={{ 
                        position: 'absolute', top: '10px', left: '10px', 
                        background: '#f39c12', color: 'white', 
                        padding: '4px 12px', borderRadius: '12px', 
                        fontSize: '0.65rem', fontWeight: 900, 
                        boxShadow: '0 4px 15px rgba(243, 156, 18, 0.4)',
                        zIndex: 10,
                        letterSpacing: '0.8px',
                        textTransform: 'uppercase'
                    }}>
                        🗓️ RESERVAR
                    </div>
                ) : (product.createdAt && (new Date().getTime() - new Date(product.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000) && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700, backdropFilter: 'blur(4px)' }}>
                        NUEVO
                    </div>
                )}
                
                <div 
                    onClick={handleQuickAdd}
                    style={{ 
                        position: 'absolute', bottom: '10px', right: '10px', 
                        background: isOutOfStock ? '#f39c12' : 'white', 
                        width: '36px', height: '36px', 
                        borderRadius: '50%', display: 'flex', alignItems: 'center', 
                        justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                        cursor: 'pointer', zIndex: 10,
                        opacity: 1,
                        transform: isOutOfStock ? 'scale(1.05)' : 'scale(1)',
                        transition: '0.2s'
                    }}
                >
                    {isOutOfStock ? '📝' : '🛒'}
                </div>

            </div>

            {product.hasOffer && (
                <div style={{ 
                    background: '#ff4d4f10', 
                    padding: '4px 12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    borderBottom: '1px solid #ff4d4f15',
                    filter: isOutOfStock ? 'grayscale(0.5)' : 'none'
                }}>
                    <span className="on-fire" style={{ fontSize: '0.8rem', display: 'inline-block' }}>🔥</span>
                    <span style={{ color: '#ff4d4f', fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.5px' }}>
                        OFERTA DEL DÍA
                    </span>
                </div>
            )}

            <div style={{ padding: '8px 12px 10px', opacity: isOutOfStock ? 0.8 : 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h4 style={{ 
                    fontSize: '0.86rem', 
                    fontWeight: 700, 
                    color: '#1a1a1a', 
                    margin: '0',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}>
                    {product.title}
                </h4>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2px 0' }}>
                    <p style={{ fontSize: '0.62rem', color: '#888', margin: '0', fontWeight: 600 }}>
                        {users?.find((u: User) => (u.id === (product as any).userId) || (u.id === (product as any).storeId))?.storeName || 'Selección Selva'}
                    </p>
                    {product.colors && product.colors.length > 0 && (
                        <ColorSwatch colors={product.colors} size="14px" border="1px solid white" />
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <div className="social-proof" style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 750, color: isOutOfStock ? '#888' : '#52c41a', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span>📈</span> {approval}% intrc.
                        </div>
                        <div style={{ fontSize: '0.6rem', fontWeight: 650, color: '#888' }}>
                            ⭐ {approval + 40} guardados
                        </div>
                    </div>
                    
                    <div style={{ textAlign: 'right', flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {product.hasOffer && product.originalPrice && product.price ? (
                            <>
                                <div style={{ fontSize: '0.62rem', textDecoration: 'line-through', color: '#aaa', fontWeight: 600, marginBottom: '-2px' }}>
                                    S/ {Number(product.originalPrice).toFixed(2)}
                                </div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: isOutOfStock ? '#888' : '#ff4d4f' }}>
                                    S/ {Number(product.price).toFixed(2)}
                                </div>
                            </>
                        ) : (
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: isOutOfStock ? '#888' : 'var(--primary)' }}>
                                S/ {Number(product.price || 0).toFixed(2)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default ProductCard;
