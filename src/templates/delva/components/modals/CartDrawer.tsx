import React from 'react';
import type { CartItem } from '@/lib/types';

interface CartDrawerProps {
    isCartOpen: boolean;
    setIsCartOpen: (val: boolean) => void;
    cart: CartItem[];
    updateCartQty: (id: string, color: string | undefined, delta: number) => void;
    referralCode: string;
    setReferralCode: (val: string) => void;
    globalWaNumber: string;
}
const CartDrawer: React.FC<CartDrawerProps> = ({
    isCartOpen, setIsCartOpen, cart, updateCartQty,
    referralCode, setReferralCode, globalWaNumber
}) => {
    if (!isCartOpen) return null;

    const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={() => setIsCartOpen(false)}
                style={{
                    position: 'fixed', inset: 0, zIndex: 1400,
                    background: 'rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(6px)',
                    animation: 'fadeIn 0.2s ease'
                }}
            />

            {/* Floating Cart Popover */}
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    position: 'fixed',
                    bottom: '110px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 'calc(100% - 30px)',
                    maxWidth: '430px',
                    maxHeight: '72vh',
                    background: 'white',
                    borderRadius: '28px',
                    zIndex: 1500,
                    boxShadow: '0 8px 60px rgba(15,48,37,0.22)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px 18px 14px',
                    background: 'var(--primary)',
                    color: 'white',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.2rem' }}>🛒</span>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>
                            Mi Carrito
                            {cart.length > 0 && (
                                <span style={{
                                    background: 'var(--accent)', color: 'var(--primary)',
                                    borderRadius: '20px', padding: '2px 8px',
                                    fontSize: '0.65rem', marginLeft: '8px', fontWeight: 900
                                }}>
                                    {cart.reduce((s, i) => s + i.quantity, 0)} items
                                </span>
                            )}
                        </h3>
                    </div>
                    <button
                        onClick={() => setIsCartOpen(false)}
                        style={{
                            background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
                            width: '28px', height: '28px', borderRadius: '50%', fontSize: '0.85rem',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >✕</button>
                </div>

                {/* Items */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
                    {cart.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '35px 0' }}>
                            <div style={{ fontSize: '2.5rem', opacity: 0.12 }}>🧺</div>
                            <p style={{ opacity: 0.45, marginTop: '8px', fontSize: '0.85rem' }}>Tu cesta está vacía</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                            {cart.map((item, idx) => (
                                <div
                                    key={`${item.id}-${idx}`}
                                    style={{
                                        display: 'flex', gap: '10px', alignItems: 'center',
                                        background: '#f8f8f8', padding: '9px 10px', borderRadius: '14px'
                                    }}
                                >
                                    <img
                                        src={item.image}
                                        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '10px', flexShrink: 0 }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontWeight: 700, fontSize: '0.8rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.title}
                                        </p>
                                        <p style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--primary)', margin: '2px 0 0' }}>
                                            S/ {Number(item.price || 0).toFixed(2)}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', background: 'white', borderRadius: '20px', border: '1px solid #ebebeb' }}>
                                            <button
                                                onClick={() => updateCartQty(item.id, item.selectedColor, -1)}
                                                style={{ width: '22px', height: '22px', background: 'none', border: 'none', fontWeight: 900, cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
                                            >−</button>
                                            <span style={{ padding: '0 5px', fontSize: '0.8rem', fontWeight: 800 }}>{item.quantity}</span>
                                            <button
                                                onClick={() => updateCartQty(item.id, item.selectedColor, 1)}
                                                style={{ width: '22px', height: '22px', background: 'none', border: 'none', fontWeight: 900, cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
                                            >+</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {cart.length > 0 && (
                    <div style={{ padding: '12px 16px 16px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                        <input
                            type="text"
                            placeholder="🎟️ Código de referido o cupón..."
                            value={referralCode}
                            onChange={e => setReferralCode(e.target.value)}
                            style={{
                                width: '100%', marginBottom: '10px', padding: '8px 12px',
                                borderRadius: '12px', border: '1px solid #eee',
                                fontSize: '0.78rem', boxSizing: 'border-box', background: '#fafafa'
                            }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.8rem', opacity: 0.55, fontWeight: 600 }}>Total</span>
                            <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--primary)' }}>S/ {Number(total || 0).toFixed(2)}</span>
                        </div>
                        <button
                            style={{
                                width: '100%', padding: '13px', background: 'var(--primary)',
                                color: 'white', border: 'none', borderRadius: '16px',
                                fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                                boxShadow: '0 6px 18px rgba(15,48,37,0.25)',
                                transition: 'transform 0.15s'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                            onClick={() => {
                                let message = `¡Hola DELVA! 🌿%0A%0AMi pedido:%0A`;
                                cart.forEach(item => {
                                    message += `%0A• *${item.title}* x${item.quantity} → S/ ${Number(item.price * item.quantity).toFixed(2)}`;
                                    if (item.selectedColor) message += ` (${item.selectedColor})`;
                                });
                                message += `%0A%0A💰 *Total: S/ ${Number(total || 0).toFixed(2)}*`;
                                if (referralCode) message += `%0A🎟️ Código: *${referralCode}*`;
                                window.open(`https://wa.me/${globalWaNumber}?text=${message}`, '_blank');
                            }}
                        >
                            🌿 Pedir por WhatsApp
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp {
                    from { transform: translateX(-50%) translateY(40px); opacity: 0; }
                    to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
                }
            `}</style>
        </>
    );
};

export default CartDrawer;
