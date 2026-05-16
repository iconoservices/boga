import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import type { Product } from '@/lib/data/products';
import type { User } from '@/lib/types';

export default function SocialHubCard({ product, author, onQuickAdd, onRecordSale, currentUser }: { product: Product, author?: User, onQuickAdd?: (p: Product) => void, onRecordSale?: (p: Product) => void, currentUser?: User | null }) {
    const router = useRouter();
    const [hypeCount, setHypeCount] = useState(Math.floor(Math.random() * 80) + 20);
    const [isHype, setIsHype] = useState(false);

    const isStore = !!author?.storeName;
    const authorName = author?.storeName || author?.name || "DELVA Pro";
    const authorLogo = author?.storeLogo || author?.photoURL;
    const isOwner = currentUser && (currentUser.id === (product as any).userId || (currentUser.role === 'master' && !(product as any).userId));

    return (
        <div className={`peeking-item social-card ${!isStore ? 'glass' : ''}`} style={{
            background: isStore ? 'white' : 'rgba(255,255,255,0.6)',
            borderRadius: '24px',
            paddingBottom: '15px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
            border: isStore ? '1px solid #f0f0f0' : '1px solid rgba(255,255,255,0.4)',
            overflow: 'hidden'
        }}>
            <div
                onClick={() => router.push(`/tienda?u=${author?.id || 'master'}&viewAsGuest=true`)}
                style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
            >
                <div className={isStore ? 'premium-ring' : 'social-ring'} style={{ width: '42px', height: '42px', flexShrink: 0 }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#eee', overflow: 'hidden', border: '2px solid white' }}>
                        {authorLogo ? <img src={authorLogo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={authorName} /> : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontWeight: 'bold' }}>{authorName[0]}</span>}
                    </div>
                </div>
                <div style={{ overflow: 'hidden' }}>
                    <p style={{ fontWeight: 900, fontSize: '0.8rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {authorName} {isStore && <span style={{ fontSize: '0.65rem', background: '#FFD700', padding: '1px 6px', borderRadius: '10px', marginLeft: '5px', color: '#000' }}>STORE</span>}
                    </p>
                    <p style={{ fontSize: '0.65rem', opacity: 0.5, margin: 0 }}>{isStore ? 'Tienda Verificada' : 'Publicación Libre'}</p>
                </div>
            </div>

            <div style={{ position: 'relative', height: '220px', margin: '0 10px', borderRadius: '18px', overflow: 'hidden' }}>
                <img src={product.image} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => router.push(`/producto/${product.id}`)} />
                <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', color: 'white', padding: '5px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 900 }}>
                    S/ {product.price}
                </div>
                {/* RECORD SALE BUTTON FOR OWNERS */}
                {isOwner && onRecordSale && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onRecordSale(product); }}
                        style={{ position: 'absolute', bottom: '12px', left: '12px', background: '#00a651', color: 'white', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', cursor: 'pointer', fontSize: '1rem', zIndex: 10 }}
                    >
                        ➕
                    </button>
                )}
                {/* QUICK ADD BUTTON */}
                <button
                    onClick={(e) => { e.stopPropagation(); if (onQuickAdd) onQuickAdd(product); }}
                    style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'white', color: 'var(--primary)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', cursor: 'pointer', fontSize: '1.1rem' }}
                >
                    🛒
                </button>
            </div>

            <div style={{ padding: '15px 15px 0' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 800, margin: '0 0 12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.title}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => { setIsHype(!isHype); setHypeCount(prev => isHype ? prev - 1 : prev + 1); }}
                        className={isHype ? 'on-fire' : ''}
                        style={{
                            flex: 1, padding: '10px', borderRadius: '14px', border: 'none',
                            background: isHype ? 'linear-gradient(45deg, #00a651, #2d6a4f)' : 'rgba(0,0,0,0.05)',
                            color: isHype ? 'white' : '#555', fontSize: '0.75rem', fontWeight: 900,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                        }}
                    >
                        {isHype ? '⚡' : '⚡'} ({hypeCount})
                    </button>
                    <button
                        onClick={() => router.push(`/producto/${product.id}`)}
                        className="btn-vibrant"
                        style={{ flex: 1, padding: '10px', fontSize: '0.75rem', borderRadius: '14px' }}
                    >
                        LO QUIERO
                    </button>
                </div>
            </div>
        </div>
    );
}
