'use client';
import React, { useState, useMemo } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product } from '@/lib/data/products';

interface SaleItem {
    product: Product;
    qty: number;
    color?: string;
}

interface SaleRecord {
    id: string;
    items: { productId: string; title: string; price: number; qty: number; color?: string }[];
    total: number;
    paymentMethod: string;
    sellerId: string;
    createdAt: any;
}

interface SalesManagerProps {
    storeProducts: Product[];
    effectiveStoreId: string;
    updateProductStock: (id: string, delta: number) => Promise<void>;
    confirmAction: (title: string, message: string, onConfirm: () => void) => void;
    globalColors: { name: string; hex: string }[];
    isMaster?: boolean;
    isSocio?: boolean;
}

const PAYMENT_METHODS = [
    { id: 'efectivo', label: '💵 Efectivo', color: '#52c41a' },
    { id: 'yape', label: '🟣 Yape/Plin', color: '#722ED1' },
    { id: 'pos', label: '💳 POS/Tarjeta', color: '#1890FF' },
    { id: 'transferencia', label: '🏦 Transferencia', color: '#13C2C2' },
    { id: 'credito', label: '📅 Al Crédito', color: '#fa8c16' },
];

const SalesManager: React.FC<SalesManagerProps> = ({
    storeProducts, effectiveStoreId, updateProductStock, confirmAction, globalColors,
    isMaster, isSocio
}) => {
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState<SaleItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState('efectivo');
    const [isSelling, setIsSelling] = useState(false);
    const [lastSale, setLastSale] = useState<SaleRecord | null>(null);
    const [cashReceived, setCashReceived] = useState('');
    const [recentSales, setRecentSales] = useState<SaleRecord[]>([]);
    const [view, setView] = useState<'pos' | 'history'>('pos');
    const [discount, setDiscount] = useState(0);

    // Filter published products with stock
    const availableProducts = useMemo(() => {
        const published = storeProducts.filter(p => (p as any).published !== false);
        if (!search) return published;
        const s = search.toLowerCase();
        return published.filter(p =>
            (p.title || '').toLowerCase().includes(s) ||
            (p.sku || '').toLowerCase().includes(s)
        );
    }, [storeProducts, search]);

    const addToCart = (product: Product, color?: string) => {
        setCart(prev => {
            const existing = prev.find(i => i.product.id === product.id && i.color === color);
            if (existing) {
                return prev.map(i =>
                    (i.product.id === product.id && i.color === color)
                        ? { ...i, qty: i.qty + 1 }
                        : i
                );
            }
            return [...prev, { product, qty: 1, color }];
        });
    };

    const removeFromCart = (productId: string, color?: string) => {
        setCart(prev => prev.filter(i => !(i.product.id === productId && i.color === color)));
    };

    const updateQty = (productId: string, color: string | undefined, delta: number) => {
        setCart(prev => prev.map(i => {
            if (i.product.id === productId && i.color === color) {
                const newQty = i.qty + delta;
                if (newQty <= 0) return null as any;
                return { ...i, qty: newQty };
            }
            return i;
        }).filter(Boolean));
    };

    const subtotal = cart.reduce((sum, i) => sum + (Number(i.product.price) * i.qty), 0);
    const discountAmount = (subtotal * discount) / 100;
    const total = subtotal - discountAmount;
    const change = paymentMethod === 'efectivo' && cashReceived ? Math.max(0, Number(cashReceived) - total) : 0;

    const getColorName = (hex: string) => globalColors.find(c => c.hex.toLowerCase() === hex.toLowerCase())?.name || hex;

    const completeSale = async () => {
        if (cart.length === 0) return;
        setIsSelling(true);
        try {
            const saleData = {
                items: cart.map(i => ({
                    productId: i.product.id,
                    title: i.product.title,
                    price: Number(i.product.price),
                    costPrice: i.product.costPrice !== undefined ? Number(i.product.costPrice) : undefined,
                    qty: i.qty,
                    color: i.color || undefined,
                    sku: i.product.sku || undefined,
                })),
                subtotal,
                discount,
                discountAmount,
                total,
                paymentMethod,
                cashReceived: paymentMethod === 'efectivo' ? Number(cashReceived) : undefined,
                change: paymentMethod === 'efectivo' ? change : undefined,
                sellerId: effectiveStoreId,
                createdAt: serverTimestamp(),
            };

            const ref = await addDoc(collection(db, 'sales'), saleData);

            // Decrease stock for each item
            for (const item of cart) {
                await updateProductStock(item.product.id, -item.qty);
            }

            const saved: SaleRecord = {
                id: ref.id,
                items: saleData.items,
                total,
                paymentMethod,
                sellerId: effectiveStoreId,
                createdAt: new Date(),
            };
            setLastSale(saved);
            setRecentSales(prev => [saved, ...prev.slice(0, 9)]);
            setCart([]);
            setCashReceived('');
            setDiscount(0);
        } catch (e) {
            console.error('Error registrando venta:', e);
            alert('Error al registrar la venta. Revisa la consola.');
        } finally {
            setIsSelling(false);
        }
    };

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Header COMPACTO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', padding: '0 5px' }}>
                <div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, color: 'var(--primary)' }}>Punto de Venta 💰</h2>
                    <p style={{ fontSize: '0.7rem', color: '#888', margin: '1px 0 0' }}>Registra ventas en tiempo real</p>
                </div>
                <div style={{ flex: 1, maxWidth: '350px', margin: '0 10px' }}>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="🔍 Buscar producto o SKU..."
                        style={{ width: '100%', height: '34px', padding: '0 12px', borderRadius: '10px', border: '1.5px solid #eee', outline: 'none', fontSize: '0.8rem', boxSizing: 'border-box', background: '#fcfcfc' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '5px', background: '#f5f5f5', padding: '3px', borderRadius: '12px', flexShrink: 0 }}>
                    <button onClick={() => setView('pos')} style={{ padding: '6px 12px', borderRadius: '10px', border: 'none', background: view === 'pos' ? 'white' : 'transparent', color: view === 'pos' ? 'var(--primary)' : '#888', fontWeight: 900, fontSize: '0.7rem', cursor: 'pointer', boxShadow: view === 'pos' ? 'var(--shadow-sm)' : 'none' }}>🛒 Vender</button>
                    <button onClick={() => setView('history')} style={{ padding: '6px 12px', borderRadius: '10px', border: 'none', background: view === 'history' ? 'white' : 'transparent', color: view === 'history' ? 'var(--primary)' : '#888', fontWeight: 900, fontSize: '0.7rem', cursor: 'pointer', boxShadow: view === 'history' ? 'var(--shadow-sm)' : 'none' }}>📋 Historial</button>
                </div>
            </div>

            {/* SUCCESS TOAST for last sale */}
            {lastSale && (
                <div style={{ background: 'linear-gradient(135deg, #52c41a, #389e0d)', color: 'white', borderRadius: '20px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p style={{ margin: 0, fontWeight: 900, fontSize: '0.9rem' }}>✅ ¡Venta registrada con éxito!</p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', opacity: 0.9 }}>
                            S/ {lastSale.total.toFixed(2)} · {PAYMENT_METHODS.find(m => m.id === lastSale.paymentMethod)?.label} · {lastSale.items.length} producto(s)
                        </p>
                    </div>
                    <button onClick={() => setLastSale(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 900 }}>✕</button>
                </div>
            )}

            {view === 'pos' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr min(380px, 40%)', gap: '16px', alignItems: 'start' }}>
                    {/* LEFT: Product grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', maxHeight: '72vh', overflowY: 'auto', paddingRight: '4px' }}>
                            {availableProducts.map(p => {
                                const stock = Number((p as any).stock) ?? 0;
                                const outOfStock = stock <= 0;
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => !outOfStock && addToCart(p)}
                                        style={{
                                            background: 'white', borderRadius: '18px', overflow: 'hidden',
                                            border: '1.5px solid #f0f0f0', cursor: outOfStock ? 'not-allowed' : 'pointer',
                                            opacity: outOfStock ? 0.5 : 1, transition: 'all 0.15s',
                                            boxShadow: 'var(--shadow-sm)'
                                        }}
                                        onMouseEnter={e => { if (!outOfStock) (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                                    >
                                        <div style={{ position: 'relative' }}>
                                            <img src={p.image} style={{ width: '100%', height: '100px', objectFit: 'cover' }} alt={p.title} />
                                            <span style={{ position: 'absolute', top: '6px', right: '6px', background: outOfStock ? '#ff4d4f' : stock <= 5 ? '#fa8c16' : '#52c41a', color: 'white', fontSize: '0.6rem', fontWeight: 900, padding: '2px 6px', borderRadius: '6px' }}>
                                                {outOfStock ? 'AGOTADO' : `${stock} uds`}
                                            </span>
                                        </div>
                                        <div style={{ padding: '8px 10px' }}>
                                            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                                            <p style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--accent)', margin: '2px 0 0' }}>S/ {Number(p.price).toFixed(2)}</p>
                                            {p.sku && <p style={{ fontSize: '0.55rem', color: '#bbb', margin: '2px 0 0', fontWeight: 700 }}>{p.sku}</p>}
                                        </div>
                                    </div>
                                );
                            })}
                            {availableProducts.length === 0 && (
                                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#ccc' }}>
                                    <p style={{ fontSize: '2rem' }}>🔍</p>
                                    <p>No se encontraron productos</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Ticket / Cart */}
                    <div style={{ background: 'white', borderRadius: '24px', padding: '20px', border: '1px solid #f0f0f0', boxShadow: 'var(--shadow-sm)', position: 'sticky', top: '80px' }}>
                        <h3 style={{ margin: '0 0 14px', fontWeight: 900, fontSize: '1rem', color: 'var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            🧾 Ticket de Venta
                            {cart.length > 0 && <button onClick={() => setCart([])} style={{ fontSize: '0.65rem', background: '#fff1f0', color: '#ff4d4f', border: 'none', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 800 }}>Limpiar</button>}
                        </h3>

                        {cart.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px 10px', color: '#ddd' }}>
                                <p style={{ fontSize: '2.5rem', margin: 0 }}>🛒</p>
                                <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>Toca un producto para agregarlo</p>
                            </div>
                        ) : (
                            <>
                                {/* Items */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '35vh', overflowY: 'auto', marginBottom: '14px' }}>
                                    {cart.map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 10px', background: '#f9f9f9', borderRadius: '12px' }}>
                                            <img src={item.product.image} style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} alt="" />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontSize: '0.72rem', fontWeight: 800, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product.title}</p>
                                                {item.color && <p style={{ fontSize: '0.6rem', color: '#888', margin: '1px 0 0' }}>{getColorName(item.color)}</p>}
                                                <p style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 900, margin: '1px 0 0' }}>S/ {(Number(item.product.price) * item.qty).toFixed(2)}</p>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                                <button onClick={() => updateQty(item.product.id, item.color, -1)} style={{ width: '22px', height: '22px', borderRadius: '6px', border: 'none', background: '#f0f0f0', fontWeight: 900, cursor: 'pointer', fontSize: '0.8rem' }}>−</button>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 900, minWidth: '18px', textAlign: 'center' }}>{item.qty}</span>
                                                <button onClick={() => updateQty(item.product.id, item.color, 1)} style={{ width: '22px', height: '22px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 900, cursor: 'pointer', fontSize: '0.8rem' }}>+</button>
                                                <button onClick={() => removeFromCart(item.product.id, item.color)} style={{ width: '22px', height: '22px', borderRadius: '6px', border: 'none', background: '#fff1f0', color: '#ff4d4f', fontWeight: 900, cursor: 'pointer', fontSize: '0.7rem', marginLeft: '2px' }}>🗑️</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Discount */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 700, flexShrink: 0 }}>% Descuento:</span>
                                    <input
                                        type="number" min="0" max="100"
                                        value={discount}
                                        onChange={e => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                                        style={{ width: '60px', padding: '5px 8px', borderRadius: '8px', border: '1.5px solid #eee', fontWeight: 800, fontSize: '0.85rem', textAlign: 'center' }}
                                    />
                                    {discount > 0 && <span style={{ fontSize: '0.7rem', color: '#ff4d4f', fontWeight: 800 }}>−S/ {discountAmount.toFixed(2)}</span>}
                                </div>

                                {/* Totals */}
                                <div style={{ borderTop: '1.5px solid #f0f0f0', paddingTop: '12px', marginBottom: '12px' }}>
                                    {discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#aaa' }}>Subtotal</span>
                                        <span style={{ fontSize: '0.75rem', color: '#aaa' }}>S/ {subtotal.toFixed(2)}</span>
                                    </div>}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--primary)' }}>TOTAL</span>
                                        <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--accent)' }}>S/ {total.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Payment Method */}
                                <div style={{ marginBottom: '12px' }}>
                                    <p style={{ fontSize: '0.65rem', fontWeight: 900, color: '#888', margin: '0 0 6px', textTransform: 'uppercase' }}>Método de Pago</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {PAYMENT_METHODS.map(m => (
                                            <button key={m.id} onClick={() => setPaymentMethod(m.id)} style={{ padding: '5px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.7rem', background: paymentMethod === m.id ? m.color : '#f5f5f5', color: paymentMethod === m.id ? 'white' : '#666', transition: 'all 0.15s' }}>
                                                {m.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Cash Received (only for efectivo) */}
                                {paymentMethod === 'efectivo' && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <p style={{ fontSize: '0.65rem', fontWeight: 900, color: '#888', margin: '0 0 5px', textTransform: 'uppercase' }}>Efectivo Recibido</p>
                                        <input
                                            type="number"
                                            value={cashReceived}
                                            onChange={e => setCashReceived(e.target.value)}
                                            placeholder="S/ 0.00"
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #eee', fontWeight: 800, fontSize: '0.95rem', boxSizing: 'border-box' }}
                                        />
                                        {cashReceived && Number(cashReceived) >= total && (
                                            <p style={{ fontSize: '0.8rem', color: '#52c41a', fontWeight: 900, margin: '6px 0 0' }}>
                                                💵 Vuelto: S/ {change.toFixed(2)}
                                            </p>
                                        )}
                                        {cashReceived && Number(cashReceived) < total && (
                                            <p style={{ fontSize: '0.75rem', color: '#ff4d4f', fontWeight: 800, margin: '6px 0 0' }}>
                                                ⚠️ Falta S/ {(total - Number(cashReceived)).toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Complete Sale Button */}
                                <button
                                    onClick={() => confirmAction(
                                        '¿Confirmar Venta?',
                                        `${cart.length} producto(s) · S/ ${total.toFixed(2)} · ${PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}`,
                                        completeSale
                                    )}
                                    disabled={isSelling}
                                    style={{ width: '100%', padding: '14px', background: isSelling ? '#ccc' : 'linear-gradient(135deg, var(--primary), var(--accent))', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 900, fontSize: '1rem', cursor: isSelling ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', transition: 'all 0.2s' }}
                                >
                                    {isSelling ? '⏳ Registrando...' : '✅ COMPLETAR VENTA'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                /* HISTORY VIEW */
                <div style={{ background: 'white', borderRadius: '24px', padding: '24px', border: '1px solid #f0f0f0' }}>
                    <h3 style={{ margin: '0 0 18px', fontWeight: 900, fontSize: '1.1rem' }}>📋 Ventas Recientes (Esta Sesión)</h3>
                    {recentSales.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '50px', color: '#ccc' }}>
                            <p style={{ fontSize: '3rem', margin: 0 }}>📭</p>
                            <p style={{ marginTop: '10px' }}>Aún no hay ventas en esta sesión</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {recentSales.map((sale, i) => (
                                <div key={sale.id} style={{ padding: '16px 20px', background: '#f9f9f9', borderRadius: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontWeight: 900, margin: 0, fontSize: '0.85rem' }}>
                                            Venta #{recentSales.length - i} · {sale.items.length} producto(s)
                                        </p>
                                        <p style={{ fontSize: '0.7rem', color: '#aaa', margin: '3px 0 0' }}>
                                            {sale.items.map(it => it.title).join(', ')}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <p style={{ fontWeight: 900, color: 'var(--accent)', fontSize: '1rem', margin: 0 }}>S/ {sale.total.toFixed(2)}</p>
                                        <span style={{ fontSize: '0.65rem', background: '#f0f0f0', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, color: '#666' }}>
                                            {PAYMENT_METHODS.find(m => m.id === sale.paymentMethod)?.label}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SalesManager;
