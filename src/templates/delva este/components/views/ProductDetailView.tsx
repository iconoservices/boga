'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Product } from '@/lib/data/products';
import type { User } from '@/lib/types';
import useUserPreferences from '@/lib/utils/useUserPreferences';
import ColorSwatch from '../common/ColorSwatch';

/**
 * 🌿 VISTA DE DETALLE DE PRODUCTO - REFACTORIZACIÓN PREMIUM v2.0
 * -----------------------------------------------------------
 * Rediseño sólido con enfoque Mobile-First (iPhone 13) y PC Optimizado.
 */

interface ProductDetailViewProps {
    isLoading?: boolean;
    products: Product[];
    users: User[];
    addToCart: (product: Product, color?: string) => void;
    getWhatsAppLink: (product: Product, color?: string) => string;
    cartCount: number;
    currentUser: User | null;
    onRecordSale?: (product: Product) => void;
}

const ProductDetailView: React.FC<ProductDetailViewProps> = ({
    isLoading,
    products,
    users,
    addToCart,
    getWhatsAppLink,
    cartCount,
    currentUser,
    onRecordSale
}) => {
    const [selectedColor, setSelectedColor] = useState<string>('');
    const { trackView } = useUserPreferences(currentUser);
    const params = useParams();
    const slug = params?.slug as string;
    const router = useRouter();

    const [currentImg, setCurrentImg] = useState(0);
    const [isHype, setIsHype] = useState(false);
    const [currentUrl, setCurrentUrl] = useState('');

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [slug]);

    // Smart back: si hay historial previo en el sitio, vuelve; si no, va al home
    const canGoBack = useRef(false);
    useEffect(() => {
        // Se marca true solo si el usuario llegó navegando dentro del sitio
        canGoBack.current = window.history.length > 1 && document.referrer.includes(window.location.origin);
    }, []);

    useEffect(() => { setCurrentUrl(window.location.href); }, []);

    const product = products.find(p => p.slug === slug || p.id === slug);

    useEffect(() => {
        if (product && product.categoryId) {
            trackView(product.categoryId);
        }
    }, [slug, product, trackView]);

    if (isLoading) return (
        <div style={{ padding: '100px 20px', textAlign: 'center', background: 'white', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 20px', borderTopColor: '#1A3C34', width: '40px', height: '40px' }}></div>
            <h3 style={{ color: '#888' }}>Cargando producto...</h3>
        </div>
    );

    if (!product) return (
        <div style={{ padding: '100px 20px', textAlign: 'center', background: 'white', minHeight: '100vh' }}>
            <h2 style={{ marginBottom: '20px', fontWeight: 900 }}>Producto no encontrado 🌿</h2>
            <button onClick={() => router.push('/')} className="btn-vibrant" style={{ padding: '15px 40px', borderRadius: '20px' }}>Volver a la tienda</button>
        </div>
    );

    const seller = (users && users.length > 0) 
        ? (users.find(u => u.id === product.userId) || users.find(u => u.id === 'master') || users[0])
        : { 
            name: 'Vendedor Delva', 
            storeName: 'Tienda Delva', 
            id: 'default',
            photoURL: '',
            initials: 'TD',
            customPrimary: '#1A3C34',
            role: 'socio' as any,
            whatsapp: '',
            email: ''
          };
        
    const isOwner = currentUser && (currentUser.id === seller.id || (currentUser.role === 'master' && !product.userId));
    const themeColor = seller?.customPrimary || '#1A3C34';

    const images = [product.image, ...(product.gallery || [])].filter(img => img && img.trim() !== '');
    const isOutOfStock = (Number(product.stock) || 0) <= 0;
    const details = product.details && product.details.length > 0 ? product.details : [];

    // ---- SEO structured data ----

    const structuredData = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.title,
        "image": images,
        "description": product.description || `Compra ${product.title} en DELVA, tu marketplace amazónico.`,
        "sku": product.id,
        "brand": { "@type": "Brand", "name": "DELVA" },
        "offers": {
            "@type": "Offer",
            "url": currentUrl,
            "priceCurrency": "PEN",
            "price": product.price,
            "itemCondition": "https://schema.org/NewCondition",
            "availability": isOutOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
            "seller": { "@type": "Organization", "name": seller?.storeName || seller?.name || 'Delva' }
        }
    };

    return (
        <div className="product-mobile-container fade-in" style={{ 
            '--theme-accent': themeColor,
            filter: isOutOfStock ? 'brightness(0.98)' : 'none'
        } as any}>
            {/* SEO Invisible Tag */}
            <script type="application/ld+json">
                {JSON.stringify(structuredData)}
            </script>

            {/* 🏪 CABECERA DINÁMICA */}
            <header className="product-sticky-header">
                <button 
                    onClick={() => {
                        if (canGoBack.current) {
                            router.back();
                        } else {
                            router.push('/');
                        }
                    }} 
                    className="back-btn-native"
                >←</button>

                <div className="seller-profile-anchor" onClick={() => router.push('/')}>
                    <div className="seller-mini-avatar" style={{ border: `2px solid ${themeColor}22` }}>
                        <img src={seller.photoURL || 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=100&q=80'} alt="avatar" />
                    </div>
                    <div className="seller-header-info">
                        <span className="seller-store-name">{seller.storeName || seller.name}</span>
                        <div className="seller-status-row">
                            <span className="status-dot" style={{ background: themeColor }}></span>
                            <span className="status-text" style={{ color: themeColor }}>Verificado</span>
                        </div>
                    </div>
                </div>

                <div className="header-actions-native">
                    <div className="cart-trigger-native" onClick={() => (window as any).dispatchEvent(new CustomEvent('openCart'))}>
                        <span style={{ fontSize: '1.2rem' }}>🛒</span>
                        {cartCount > 0 && <span className="cart-badge-native" style={{ background: themeColor }}>{cartCount}</span>}
                    </div>
                </div>
            </header>

            <div className="product-detail-grid">

                {/* 📸 SECCIÓN VISUAL (Móvil y PC) - PREMIUM CAROUSEL */}
                <div className="carousel-section">
                    <div className="image-carousel-wrapper" style={{ 
                        position: 'relative', 
                        overflow: 'hidden', 
                        aspectRatio: '1/1', 
                        background: '#f9f9f9',
                        borderRadius: '30px'
                    }}>
                        {images.map((img, i) => (
                            <img 
                                key={i}
                                src={img} 
                                alt={`${product.title} - ${i}`} 
                                className="main-detail-img" 
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    opacity: currentImg === i ? 1 : 0,
                                    transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                    zIndex: currentImg === i ? 2 : 1
                                }}
                            />
                        ))}

                        <div
                            className={`hype-heart ${isHype ? 'active' : ''}`}
                            onClick={() => setIsHype(!isHype)}
                            style={{ position: 'absolute', top: '20px', right: '20px', bottom: 'auto', zIndex: 10 }}
                        >
                            {isHype ? '🧡' : '🤍'}
                        </div>

                        {isOutOfStock && (
                            <div style={{ 
                                position: 'absolute', 
                                top: '20px', 
                                left: '20px', 
                                background: '#f39c12', 
                                color: 'white', 
                                padding: '8px 18px', 
                                borderRadius: '15px', 
                                fontSize: '0.85rem', 
                                fontWeight: 950, 
                                zIndex: 10,
                                boxShadow: '0 8px 30px rgba(243, 156, 18, 0.4)',
                                letterSpacing: '1px'
                            }}>
                                🗓️ RESERVAR
                            </div>
                        )}

                        <div style={{ position: 'absolute', bottom: '20px', left: '20px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', color: 'white', padding: '4px 12px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 900, zIndex: 10 }}>
                            {currentImg + 1} / {images.length}
                        </div>
                    </div>

                    {/* Galería de Miniaturas */}
                    {images.length > 1 && (
                        <div className="thumb-gallery">
                            {images.map((img, i) => (
                                <div
                                    key={i}
                                    className={`thumb-item ${currentImg === i ? 'active' : ''}`}
                                    onClick={() => setCurrentImg(i)}
                                    style={{ 
                                        borderColor: currentImg === i ? themeColor : '#eee',
                                        opacity: currentImg === i ? 1 : 0.6
                                    }}
                                >
                                    <img src={img} alt="thumb" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 📝 PANEL DE INFORMACIÓN (Sticky en PC) */}
                <div className="product-info-sticky">
                    <div className="product-info-sheet">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span className="category-label-compact" style={{ color: themeColor }}>{product.category}</span>
                            {!isOutOfStock && (
                                <div className="fire-stats" style={{ marginTop: 0 }}>
                                    <span className="fire-icon">🔥</span>
                                    <span style={{ fontWeight: 800 }}>{(product.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % 50) + 10} interesados</span>
                                </div>
                            )}
                        </div>

                        <h1 className="product-title-native">{product.title}</h1>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: isOutOfStock ? '10px' : '0' }}>
                            <div className="product-price-native" style={{ color: themeColor, fontSize: '1.6rem' }}>S/ {Number(product.price || 0).toFixed(2)}</div>
                            {product.hasOffer && product.originalPrice && (
                                <div style={{ fontSize: '1rem', textDecoration: 'line-through', color: '#bbb', fontWeight: 600 }}>S/ {Number(product.originalPrice).toFixed(2)}</div>
                            )}
                        </div>

                        {isOutOfStock && (
                            <div style={{ 
                                background: '#fff9f0', 
                                border: '1px dashed #f39c12', 
                                padding: '12px 18px', 
                                borderRadius: '16px', 
                                marginBottom: '20px' 
                            }}>
                                <p style={{ fontSize: '0.85rem', color: '#d35400', fontWeight: 900, margin: 0 }}>
                                    ✨ PRODUCTO BAJO PEDIDO
                                </p>
                                <p style={{ fontSize: '0.75rem', color: '#e67e22', fontWeight: 600, margin: '4px 0 0' }}>
                                    ¡No te quedes sin el tuyo! Sepáralo hoy con solo <b>S/ 20.00</b> y asegura tu llegada.
                                </p>
                            </div>
                        )}

                        {/* SELECTOR DE COLOR (Bicolor Identity) */}
                        {product.colors && product.colors.length > 0 && (
                            <div className="selector-section" style={{ marginTop: '30px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span className="selector-label" style={{ fontWeight: 950, opacity: 0.8, fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                                        {product.colors.length > 1 ? 'COMBINACIÓN DE COLOR' : 'COLOR DEL PRODUCTO'}
                                    </span>
                                </div>
                                <div className="color-row-native">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <ColorSwatch 
                                            colors={product.colors} 
                                            size="56px" 
                                            border="4px solid white" 
                                            shadow="0 6px 20px rgba(0,0,0,0.15)"
                                        />
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 850, color: '#1a1a1a' }}>
                                                {product.colors.length > 1 ? 'Edición Bicolor' : 'Color Sólido'}
                                            </span>
                                            <span style={{ fontSize: '0.7rem', color: '#999', fontWeight: 700 }}>Identidad del Modelo</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ACCIONES PRINCIPALES (Visible en PC, Oculto en Móvil por el Sticky Bar) */}
                        <div className="action-row-native mobile-hide" style={{ marginTop: '40px' }}>
                            <a
                                href={getWhatsAppLink(product, selectedColor)}
                                target="_blank"
                                className="btn-native-wsp"
                                style={{ textDecoration: 'none', flex: 1, height: '60px' }}
                            >
                                💬 LO QUIERO
                            </a>
                            <button
                                className="btn-native-cart"
                                onClick={() => addToCart(product, selectedColor)}
                                disabled={!!(product.colors?.length && !selectedColor)}
                                style={{ backgroundColor: themeColor, border: 'none', flex: 1.5, height: '60px' }}
                            >
                                🛒 AGREGAR AL CARRITO
                            </button>
                        </div>

                        {/* CARACTERÍSTICAS */}
                        <div className="details-card-native" style={{ marginTop: '40px', background: '#fdfdfd', border: '1px solid #f0f0f0', borderRadius: '25px', padding: '25px' }}>
                            <h4 style={{ color: themeColor, fontSize: '0.75rem', letterSpacing: '1px', fontWeight: 950 }}>ESPECIFICACIONES</h4>
                            <div className="details-list-native" style={{ marginTop: '20px' }}>
                                {details.map((d: string, i: number) => (
                                    <div key={i} className="detail-item-native" style={{ padding: '10px 0', borderBottom: i === details.length - 1 ? 'none' : '1px solid #f5f5f5' }}>
                                        <span className="check-native" style={{ color: themeColor, fontSize: '1.1rem' }}>✦</span>
                                        <span style={{ fontSize: '0.95rem', color: '#333', fontWeight: 600 }}>{d}</span>
                                    </div>
                                ))}
                                {details.length === 0 && (
                                    <p style={{ fontSize: '0.85rem', color: '#888', fontStyle: 'italic' }}>Información Premium de Delva.</p>
                                )}
                            </div>
                        </div>

                        {/* ACCIONES DE MASTER */}
                        {isOwner && onRecordSale && (
                            <div style={{ marginTop: '30px', padding: '20px', border: `2px dashed ${themeColor}44`, borderRadius: '25px', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.7rem', fontWeight: 950, marginBottom: '12px', opacity: 0.6 }}>GESTIÓN DE STOCK</p>
                                <button
                                    onClick={() => onRecordSale(product)}
                                    className="lo-quiero-btn"
                                    style={{ width: '100%', background: themeColor, height: '50px' }}
                                >
                                    REGISTRAR VENTA (+1)
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* BARRA DE ACCIÓN PEGAJOSA (Solo Móvil) */}
            <div className="sticky-action-bar">
                <a
                    href={getWhatsAppLink(product, selectedColor)}
                    target="_blank"
                    className="btn-native-wsp"
                    style={{ textDecoration: 'none', flex: 1, borderRadius: '18px' }}
                >
                    💬 LO QUIERO
                </a>
                <button
                    className="btn-native-cart"
                    onClick={() => addToCart(product, selectedColor)}
                    disabled={!!(product.colors?.length && !selectedColor)}
                    style={{ backgroundColor: themeColor, border: 'none', flex: 2, borderRadius: '18px' }}
                >
                    🛒 AGREGAR
                </button>
            </div>

            <style>{`
                @media (max-width: 1023px) {
                    .mobile-hide { display: none !important; }
                }
            `}</style>
        </div>
    );
};

export default ProductDetailView;
