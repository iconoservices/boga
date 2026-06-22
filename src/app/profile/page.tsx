'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { getTemplate } from '@/lib/templates.config';

// --- Mock user data (will be replaced with Supabase auth later) ---
const MOCK_USER = {
  name: 'Carlos Mejía',
  email: 'carlos@gmail.com',
  phone: '51987654321',
  address: 'Av. Larco 345, Miraflores',
  avatar: '', // empty = use initials
  isMerchant: true, // has a store on Boga
  merchantStore: 'estilosmirka', // which store slug
  joinedDate: 'Mayo 2025',
};

const MOCK_ORDERS = [
  { id: 'ORD-7734', store: 'estilosmirka', storeName: 'Estilos Mirka', items: 'Vestido Floral + Blusa', total: 210.00, date: 'Hace 1 semana', status: 'Entregado' },
  { id: 'ORD-5543', store: 'polleria', storeName: 'Pollería Bravoz', items: 'Pollo Brasa + Papas + Inca Kola', total: 55.00, date: 'Hace 3 días', status: 'Entregado' },
];

const STATUS_COLORS: Record<string, string> = {
  'Entregado': '#16a34a',
  'En camino': '#d97706',
  'Cancelado': '#dc2626',
};

export default function ProfilePage() {
  const [user, setUser] = useState(MOCK_USER);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: user.name, phone: user.phone, address: user.address });
  const [activeSection, setActiveSection] = useState<'perfil' | 'pedidos' | 'ajustes'>('perfil');
  const [notifOrders, setNotifOrders] = useState(true);
  const [notifPromos, setNotifPromos] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const merchantConfig = getTemplate(user.merchantStore);

  const handleSave = () => {
    setUser(prev => ({ ...prev, ...editForm }));
    setIsEditing(false);
  };

  const ff = "'Outfit', sans-serif";

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 14px', backgroundColor: '#f5f5f5',
    border: '1.5px solid transparent', borderRadius: '12px',
    outline: 'none', fontSize: '13px', fontWeight: 500,
    fontFamily: ff, color: '#111', transition: 'all 0.2s',
  };

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} style={{
      width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
      backgroundColor: on ? '#000' : '#e5e7eb', position: 'relative', transition: 'all 0.25s', padding: 0,
    }}>
      <div style={{
        width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#fff',
        position: 'absolute', top: '3px', left: on ? '23px' : '3px', transition: 'all 0.25s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }} />
    </button>
  );

  const navTabs: { key: typeof activeSection; label: string; icon: string }[] = [
    { key: 'perfil', label: 'Mi Perfil', icon: 'person' },
    { key: 'pedidos', label: 'Mis Pedidos', icon: 'receipt_long' },
    { key: 'ajustes', label: 'Ajustes', icon: 'settings' },
  ];

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 16px 24px' }}>

      {/* ── Hero / Avatar Card ── */}
      <div style={{
        background: 'linear-gradient(135deg, #111 0%, #2d2d2d 100%)',
        borderRadius: '24px', padding: '28px', marginBottom: '20px',
        display: 'flex', alignItems: 'center', gap: '20px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
      }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
        }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: '24px' }}>{initials}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Bienvenido 👋
          </p>
          <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '22px', margin: '2px 0 4px', lineHeight: 1.2 }}>
            {user.name}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 500, margin: 0 }}>
            {user.email} · Miembro desde {user.joinedDate}
          </p>
        </div>
      </div>

      {/* ── Merchant Card ── */}
      {user.isMerchant && merchantConfig && (
        <div style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
          borderRadius: '20px', padding: '20px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '16px',
          boxShadow: '0 6px 30px rgba(99,102,241,0.3)',
        }}>
          <div style={{
            width: '48px', height: '48px', backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, backdropFilter: 'blur(10px)',
          }}>
            <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '24px' }}>storefront</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Tu tienda en Boga
            </p>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: '15px', margin: '2px 0 0' }}>
              {merchantConfig.name}
            </p>
          </div>
          <Link href="/dashboard" style={{
            textDecoration: 'none',
            backgroundColor: '#fff', color: '#6366f1',
            padding: '8px 16px', borderRadius: '12px',
            fontWeight: 800, fontSize: '12px', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>dashboard</span>
            Admin
          </Link>
        </div>
      )}

      {/* ── No-merchant CTA ── */}
      {!user.isMerchant && (
        <div style={{
          backgroundColor: '#fff', borderRadius: '20px', padding: '20px',
          marginBottom: '20px', border: '2px dashed #e5e7eb',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <div style={{
            width: '48px', height: '48px', backgroundColor: '#f5f3ff',
            borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span className="material-symbols-outlined" style={{ color: '#8b5cf6', fontSize: '22px' }}>add_business</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#111', fontWeight: 800, fontSize: '14px', margin: 0 }}>¿Tienes un negocio?</p>
            <p style={{ color: '#999', fontSize: '12px', fontWeight: 500, margin: '2px 0 0', lineHeight: 1.4 }}>
              Crea tu carta digital o catálogo en Boga gratis.
            </p>
          </div>
          <a href="mailto:hola@bogamarket.com" style={{
            textDecoration: 'none', backgroundColor: '#111', color: '#fff',
            padding: '8px 14px', borderRadius: '12px',
            fontWeight: 800, fontSize: '12px', whiteSpace: 'nowrap',
          }}>
            Saber más
          </a>
        </div>
      )}

      {/* ── Section Nav Tabs ── */}
      <div style={{
        display: 'flex', gap: '6px', backgroundColor: '#fff',
        padding: '6px', borderRadius: '16px', marginBottom: '20px',
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
      }}>
        {navTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            style={{
              flex: 1, padding: '9px 6px',
              borderRadius: '12px', border: 'none', cursor: 'pointer',
              fontFamily: ff, fontSize: '12px', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              backgroundColor: activeSection === tab.key ? '#111' : 'transparent',
              color: activeSection === tab.key ? '#fff' : '#888',
              transition: 'all 0.2s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── SECTION: Mi Perfil ── */}
      {activeSection === 'perfil' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontWeight: 800, fontSize: '16px', color: '#111', margin: 0 }}>Información personal</h2>
            <button onClick={() => { setIsEditing(!isEditing); setEditForm({ name: user.name, phone: user.phone, address: user.address }); }} style={{
              background: isEditing ? '#fee2e2' : '#f5f5f5',
              color: isEditing ? '#dc2626' : '#111',
              border: 'none', borderRadius: '10px',
              padding: '7px 14px', fontSize: '12px', fontWeight: 700,
              fontFamily: ff, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '5px',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>{isEditing ? 'close' : 'edit'}</span>
              {isEditing ? 'Cancelar' : 'Editar'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { label: 'Nombre completo', value: user.name, field: 'name', icon: 'person' },
              { label: 'Correo electrónico', value: user.email, field: 'email', icon: 'mail', readonly: true },
              { label: 'WhatsApp', value: user.phone ? `+${user.phone}` : '—', field: 'phone', icon: 'phone' },
              { label: 'Dirección de entrega', value: user.address || '—', field: 'address', icon: 'location_on' },
            ].map(({ label, value, field, icon, readonly }) => (
              <div key={field}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#aaa', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {label}
                </label>
                {isEditing && !readonly ? (
                  <div style={{ position: 'relative' }}>
                    <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#bbb', fontSize: '18px' }}>{icon}</span>
                    <input
                      value={(editForm as any)[field] || ''}
                      onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
                      style={{ ...inputStyle, paddingLeft: '38px' }}
                      onFocus={e => { e.target.style.backgroundColor = '#fff'; e.target.style.borderColor = '#ddd'; }}
                      onBlur={e => { e.target.style.backgroundColor = '#f5f5f5'; e.target.style.borderColor = 'transparent'; }}
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#ccc' }}>{icon}</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: value === '—' ? '#ccc' : '#111' }}>{value}</span>
                    {readonly && <span style={{ fontSize: '10px', fontWeight: 700, color: '#bbb', backgroundColor: '#f5f5f5', padding: '2px 7px', borderRadius: '6px' }}>NO EDITABLE</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {isEditing && (
            <button onClick={handleSave} style={{
              width: '100%', marginTop: '24px', padding: '13px',
              backgroundColor: '#111', color: '#fff', border: 'none',
              borderRadius: '14px', fontSize: '14px', fontWeight: 700,
              fontFamily: ff, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            }}>
              Guardar cambios ✓
            </button>
          )}
        </div>
      )}

      {/* ── SECTION: Mis Pedidos ── */}
      {activeSection === 'pedidos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {MOCK_ORDERS.length === 0 ? (
            <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '40px 24px', textAlign: 'center', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#e5e7eb' }}>shopping_bag</span>
              <p style={{ fontWeight: 700, color: '#111', margin: '12px 0 4px' }}>Aún no tienes pedidos</p>
              <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>Explora tus tiendas favoritas</p>
              <Link href="/explore" style={{
                display: 'inline-block', marginTop: '16px',
                backgroundColor: '#111', color: '#fff', textDecoration: 'none',
                padding: '10px 24px', borderRadius: '12px', fontWeight: 700, fontSize: '13px',
              }}>
                Explorar Boga
              </Link>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                <h2 style={{ fontWeight: 800, fontSize: '16px', color: '#111', margin: 0 }}>Historial de pedidos</h2>
                <span style={{ fontSize: '12px', color: '#999', fontWeight: 600 }}>{MOCK_ORDERS.length} pedidos</span>
              </div>
              {MOCK_ORDERS.map(order => (
                <div key={order.id} style={{
                  backgroundColor: '#fff', borderRadius: '16px', padding: '16px 18px',
                  boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
                  display: 'flex', alignItems: 'center', gap: '14px',
                }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#888' }}>receipt_long</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <p style={{ fontWeight: 800, fontSize: '13px', color: '#111', margin: 0 }}>{order.storeName}</p>
                      <span style={{ fontWeight: 800, fontSize: '13px', color: '#111' }}>S/ {order.total.toFixed(2)}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#999', margin: '2px 0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {order.items}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#ccc', fontWeight: 600 }}>{order.date}</span>
                      <span style={{
                        fontSize: '10px', fontWeight: 800,
                        color: STATUS_COLORS[order.status] || '#999',
                        backgroundColor: `${STATUS_COLORS[order.status]}18` || '#f5f5f5',
                        padding: '2px 8px', borderRadius: '20px',
                      }}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <Link href="/explore" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  textDecoration: 'none', color: '#8b5cf6', fontWeight: 800, fontSize: '13px',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span>
                  Hacer un nuevo pedido
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SECTION: Ajustes ── */}
      {activeSection === 'ajustes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Notificaciones */}
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontWeight: 800, fontSize: '14px', color: '#111', margin: '0 0 16px' }}>Notificaciones</h3>
            {[
              { label: 'Estado de mis pedidos', desc: 'Confirmación, en camino, entregado', value: notifOrders, onToggle: () => setNotifOrders(v => !v) },
              { label: 'Promos de mis tiendas', desc: 'Descuentos y lanzamientos nuevos', value: notifPromos, onToggle: () => setNotifPromos(v => !v) },
            ].map(({ label, desc, value, onToggle }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '13px', color: '#111', margin: 0 }}>{label}</p>
                  <p style={{ fontSize: '11px', color: '#bbb', fontWeight: 500, margin: '2px 0 0' }}>{desc}</p>
                </div>
                <Toggle on={value} onToggle={onToggle} />
              </div>
            ))}
          </div>

          {/* Apariencia */}
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontWeight: 800, fontSize: '14px', color: '#111', margin: '0 0 16px' }}>Apariencia</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '13px', color: '#111', margin: 0 }}>Modo oscuro</p>
                <p style={{ fontSize: '11px', color: '#bbb', fontWeight: 500, margin: '2px 0 0' }}>Próximamente</p>
              </div>
              <Toggle on={darkMode} onToggle={() => setDarkMode(v => !v)} />
            </div>
          </div>

          {/* Cuenta */}
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontWeight: 800, fontSize: '14px', color: '#111', margin: 0, padding: '20px 24px 12px' }}>Cuenta</h3>
            {[
              { icon: 'lock', label: 'Cambiar contraseña', action: '#' },
              { icon: 'help', label: 'Centro de ayuda', action: '#' },
              { icon: 'privacy_tip', label: 'Privacidad y términos', action: '#' },
            ].map(({ icon, label, action }) => (
              <a key={label} href={action} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 24px', borderTop: '1px solid #f5f5f5',
                textDecoration: 'none', color: '#111',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#aaa' }}>{icon}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, flex: 1 }}>{label}</span>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#ddd' }}>chevron_right</span>
              </a>
            ))}

            <button onClick={() => { window.location.href = '/login'; }} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 24px', borderTop: '1px solid #f5f5f5',
              width: '100%', textAlign: 'left', backgroundColor: 'transparent',
              border: 'none', cursor: 'pointer', fontFamily: ff,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#ef4444' }}>logout</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>Cerrar sesión</span>
            </button>
          </div>

          {/* Version badge */}
          <p style={{ textAlign: 'center', fontSize: '11px', color: '#ccc', fontWeight: 500, marginTop: '4px' }}>
            Boga Market v1.0 · © 2026
          </p>
        </div>
      )}

    </div>
  );
}
