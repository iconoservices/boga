import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type Product } from '@/lib/data/products';
import { type User } from '@/lib/types';

interface MasterPanelProps {
    users: User[];
    products: Product[];
    globalCategories: any[];
    setActiveTab: (tab: any) => void;
    setSelectedStoreId: (id: string) => void;
    selectedStoreId: string;
    setEditingProduct: (p: Product | null) => void;
}

const MasterPanel: React.FC<MasterPanelProps> = ({ 
    users, products, globalCategories, setActiveTab, setSelectedStoreId, selectedStoreId, setEditingProduct 
}) => {
    const [masterSubTab, setMasterSubTab] = useState<'analytics' | 'users' | 'stores' | 'invites' | 'shadow'>('analytics');
    const [userSearch, setUserSearch] = useState('');
    const [userFilter, setUserFilter] = useState<'all' | 'socio' | 'customer' | 'colaborador'>('all');
    const [securityModal, setSecurityModal] = useState<{ show: boolean, title: string, message: string, action: () => void } | null>(null);
    const [generatedInviteLink, setGeneratedInviteLink] = useState('');
    const [inviteCopied, setInviteCopied] = useState(false);
    const [invGlobalView, setInvGlobalView] = useState<'grid' | 'list'>('grid');
    
    const generateInvite = async () => {
        const inviteId = Math.random().toString(36).substring(2, 11);
        await setDoc(doc(db, 'invites', inviteId), { id: inviteId, role: 'socio', createdAt: new Date().toISOString() });
        const link = `${window.location.origin}?invite=${inviteId}`;
        setGeneratedInviteLink(link);
        navigator.clipboard.writeText(link);
        setInviteCopied(true);
        setTimeout(() => setInviteCopied(false), 2000);
    };

    // Computed
    const filteredProducts = products.filter(p => {
        const seller = users.find(u => u.id === p.userId)?.name || '';
        return p.title.toLowerCase().includes(userSearch.toLowerCase()) || seller.toLowerCase().includes(userSearch.toLowerCase());
    });

    // All users who have store data (active socios + ghosts who were downgraded)
    const storeUsers = users.filter(u => u.id !== 'master' && (u.storeName || u.storeLogo));

    return (
        <div className="fade-in">
            {/* SUB-TABS SELECTOR */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '30px', background: 'var(--primary)', padding: '5px', borderRadius: '18px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                <button onClick={() => setMasterSubTab('analytics')} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: masterSubTab === 'analytics' ? 'white' : 'transparent', color: masterSubTab === 'analytics' ? 'var(--primary)' : 'white', fontWeight: 900, fontSize: '0.65rem' }}>📊 ANALYTICS</button>
                <button onClick={() => setMasterSubTab('users')} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: masterSubTab === 'users' ? 'white' : 'transparent', color: masterSubTab === 'users' ? 'var(--primary)' : 'white', fontWeight: 900, fontSize: '0.65rem' }}>👤 USUARIOS</button>
                <button onClick={() => setMasterSubTab('stores')} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: masterSubTab === 'stores' ? 'white' : 'transparent', color: masterSubTab === 'stores' ? 'var(--primary)' : 'white', fontWeight: 900, fontSize: '0.65rem' }}>🏪 TIENDAS</button>
                <button onClick={() => setMasterSubTab('inventory' as any)} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: (masterSubTab as any) === 'inventory' ? 'white' : 'transparent', color: (masterSubTab as any) === 'inventory' ? 'var(--primary)' : 'white', fontWeight: 900, fontSize: '0.65rem' }}>📦 INV. GLOBAL</button>
                <button onClick={() => setMasterSubTab('invites')} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: masterSubTab === 'invites' ? 'white' : 'transparent', color: masterSubTab === 'invites' ? 'var(--primary)' : 'white', fontWeight: 900, fontSize: '0.65rem' }}>🎫 INVITACIONES</button>
                <button onClick={() => setMasterSubTab('shadow')} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: masterSubTab === 'shadow' ? 'white' : 'transparent', color: masterSubTab === 'shadow' ? 'var(--primary)' : 'white', fontWeight: 900, fontSize: '0.65rem' }}>🕵️ SHADOW</button>
                <button onClick={() => setMasterSubTab('tools' as any)} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: (masterSubTab as any) === 'tools' ? 'white' : 'transparent', color: (masterSubTab as any) === 'tools' ? 'var(--primary)' : 'white', fontWeight: 900, fontSize: '0.65rem' }}>🛠️ TOOLS</button>
            </div>

            {masterSubTab === 'analytics' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '30px', boxShadow: 'var(--shadow-sm)' }}>
                        <p style={{ fontSize: '0.8rem', opacity: 0.5, fontWeight: 800 }}>TOTAL USUARIOS</p>
                        <h3 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '10px 0', color: 'var(--primary)' }}>{users.length}</h3>
                    </div>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '30px', boxShadow: 'var(--shadow-sm)' }}>
                        <p style={{ fontSize: '0.8rem', opacity: 0.5, fontWeight: 800 }}>SOCIOS ACTIVOS</p>
                        <h3 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '10px 0', color: 'var(--accent)' }}>{users.filter(u => u.role === 'socio').length}</h3>
                    </div>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '30px', boxShadow: 'var(--shadow-sm)' }}>
                        <p style={{ fontSize: '0.8rem', opacity: 0.5, fontWeight: 800 }}>PRODUCTOS TOTALES</p>
                        <h3 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '10px 0', color: 'var(--primary)' }}>{products.length}</h3>
                    </div>
                </div>
            )}

            {(masterSubTab as any) === 'tools' && (
                <div style={{ background: 'white', padding: '40px', borderRadius: '35px', textAlign: 'center' }}>
                    <span style={{ fontSize: '3rem' }}>👻</span>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginTop: '20px' }}>Auditoría de Categorías Internas</h3>
                    <p style={{ fontSize: '0.9rem', opacity: 0.6, maxWidth: '500px', margin: '10px auto 30px' }}>Esta es la lista real de qué IDs de categoría tienen guardados tus productos actualmente. Toca una categoría para ver y eliminar los productos asignados a ella.</p>
                    
                    <div style={{ background: '#f5f5fc', padding: '20px', borderRadius: '20px', maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {(() => {
                                const catUsage: Record<string, { count: number, names: Set<string>, products: Product[] }> = {};
                                products.forEach(p => {
                                    const cId = p.categoryId || 'sin-id';
                                    const cName = p.category || 'Sin Nombre';
                                    if (!catUsage[cId]) catUsage[cId] = { count: 0, names: new Set(), products: [] };
                                    catUsage[cId].count++;
                                    catUsage[cId].names.add(cName);
                                    catUsage[cId].products.push(p);
                                });

                                return Object.entries(catUsage).map(([cId, data]) => {
                                    const isGlobal = globalCategories?.some(gc => gc.id === cId);
                                    const isExpanded = (window as any)._expandedCat === cId;
                                    return (
                                        <div key={cId} style={{ 
                                            background: isGlobal ? '#E6FFED' : '#FFF1F0', 
                                            border: `1px solid ${isGlobal ? '#95DE64' : '#FFA39E'}`, 
                                            borderRadius: '15px', 
                                            width: '100%', 
                                            overflow: 'hidden'
                                        }}>
                                            <div 
                                                onClick={() => {
                                                    (window as any)._expandedCat = isExpanded ? null : cId;
                                                    // Force a re-render of just this section by toggling a dummy state if needed, but since it's a global hack let's just use component state.
                                                    // Wait, since I can't easily add a new useState hook inside the existing component block via replace, I'll use a standard DOM update hack.
                                                    const el = document.getElementById(`cat-list-${cId}`);
                                                    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
                                                }}
                                                style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                            >
                                                <div>
                                                    <p style={{ margin: 0, fontWeight: 900, fontSize: '0.9rem', color: isGlobal ? '#237804' : '#CF1322' }}>
                                                        {Array.from(data.names).join(' / ')}
                                                    </p>
                                                    <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: '#555', fontFamily: 'monospace' }}>
                                                        ID: {cId} {isGlobal ? '✅ Oficial' : '👻 FANTASMA'}
                                                    </p>
                                                </div>
                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                    <div style={{ background: isGlobal ? '#389E0D' : '#CF1322', color: 'white', padding: '6px 14px', borderRadius: '30px', fontWeight: 900, fontSize: '0.8rem' }}>
                                                        {data.count} productos ▾
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div id={`cat-list-${cId}`} style={{ display: 'none', background: 'rgba(0,0,0,0.02)', borderTop: '1px solid rgba(0,0,0,0.05)', padding: '15px' }}>
                                                {data.products.map(p => (
                                                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                                        <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                                            <strong style={{ fontSize: '0.8rem' }}>{p.title}</strong>
                                                            <br/><span style={{ fontSize: '0.7rem', opacity: 0.6 }}>ID: {p.id.slice(-6)}</span>
                                                        </div>
                                                        <button 
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (window.confirm(`¿Seguro que deseas ELIMINAR el producto "${p.title}" de la base de datos por completo?`)) {
                                                                    const { doc: fsDoc, deleteDoc } = await import('firebase/firestore');
                                                                    await deleteDoc(fsDoc(db, 'products', p.id));
                                                                }
                                                            }}
                                                            style={{ background: '#CF1322', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', marginLeft: '10px' }}
                                                        >
                                                            🗑️ Borrar Producto
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>
            )}
            {masterSubTab === 'users' && (
                <div style={{ width: '100%', padding: '0' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0 }}>Gestión de la Comunidad</h3>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <select 
                                value={userFilter} 
                                onChange={e => setUserFilter(e.target.value as any)}
                                style={{ padding: '8px', borderRadius: '10px', fontSize: '0.8rem', border: '1px solid #ddd', background: 'white' }}
                            >
                                <option value="all">Todos</option>
                                <option value="socio">Socios</option>
                                <option value="colaborador">Colaboradores</option>
                                <option value="customer">Clientes</option>
                            </select>
                            <input 
                                type="text" 
                                placeholder="🔍 Buscar..." 
                                value={userSearch} 
                                onChange={e => setUserSearch(e.target.value)}
                                style={{ padding: '8px 15px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '0.8rem', background: 'white' }}
                            />
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto', background: 'white', borderRadius: '20px', border: '1px solid #f0f0f0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #f0f0f0', background: '#fafafa' }}>
                                    <th style={{ padding: '12px 15px', fontSize: '0.7rem', opacity: 0.5, fontWeight: 900 }}>USUARIO</th>
                                    <th style={{ padding: '12px 15px', fontSize: '0.7rem', opacity: 0.5, fontWeight: 900 }}>ROL</th>
                                    <th style={{ padding: '12px 15px', fontSize: '0.7rem', opacity: 0.5, fontWeight: 900 }}>ACCIONES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.filter(u => {
                                    const matchSearch = u.name.toLowerCase().includes(userSearch.toLowerCase());
                                    const matchFilter = userFilter === 'all' || u.role === userFilter;
                                    return matchSearch && matchFilter;
                                }).map(u => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                        <td style={{ padding: '10px 15px' }}>
                                            <p style={{ fontWeight: 800, margin: 0, fontSize: '0.85rem' }}>{u.name}</p>
                                            <p style={{ fontSize: '0.65rem', color: '#888', margin: 0 }}>{u.email}</p>
                                        </td>
                                        <td style={{ padding: '10px 15px' }}>
                                            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--primary)', background: 'var(--bg)', padding: '4px 10px', borderRadius: '8px' }}>{u.role?.toUpperCase()}</span>
                                        </td>
                                        <td style={{ padding: '10px 15px' }}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => { setSelectedStoreId(u.id); setActiveTab('inventory'); }} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>Entrar 🕵️</button>
                                                <button onClick={() => {
                                                    const nextRole = u.role === 'socio' ? 'customer' : 'socio';
                                                    setSecurityModal({
                                                        show: true,
                                                        title: 'Cambiar Rol',
                                                        message: `¿Convertir a ${u.name} en ${nextRole.toUpperCase()}?`,
                                                        action: async () => await setDoc(doc(db, 'users', u.id), { role: nextRole }, { merge: true })
                                                    });
                                                }} style={{ background: 'transparent', border: '1px solid #ddd', padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 800 }}>Rol 🔄</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {(masterSubTab as any) === 'inventory' && (
                <div className="fade-in">
                    {/* Header + Toolbar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0 }}>Inventario Global del Marketplace</h3>
                            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#888' }}>{products.length} productos en total</p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                                type="text"
                                placeholder="🔍 Buscar por producto o vendedor..."
                                value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                                style={{ padding: '10px 15px', borderRadius: '13px', border: '1.5px solid #eee', fontSize: '0.82rem', outline: 'none', fontFamily: '"Outfit", sans-serif' }}
                            />
                            {/* View toggle */}
                            <div style={{ display: 'flex', background: '#f0f0f0', borderRadius: '12px', padding: '4px', gap: '4px' }}>
                                <button onClick={() => setInvGlobalView('grid')}
                                    style={{ padding: '7px 13px', borderRadius: '9px', border: 'none', background: invGlobalView === 'grid' ? 'white' : 'transparent', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>
                                    ▦ Grid
                                </button>
                                <button onClick={() => setInvGlobalView('list')}
                                    style={{ padding: '7px 13px', borderRadius: '9px', border: 'none', background: invGlobalView === 'list' ? 'white' : 'transparent', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>
                                    ☰ Lista
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── GRID VIEW ── */}
                    {invGlobalView === 'grid' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: '14px' }}>
                            {filteredProducts.map(p => {
                                const seller = users.find(u => u.id === p.userId);
                                const isPublished = (p as any).published;
                                const slugify = (t: string) => t?.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '').slice(0, 30) || 'producto';
                                return (
                                    <div key={p.id} style={{ background: '#111', borderRadius: '18px', overflow: 'hidden', border: '1px solid #222', position: 'relative' }}>
                                        <div style={{ aspectRatio: '4/3', background: '#1a1a1a', overflow: 'hidden' }}>
                                            {p.image
                                                ? <img src={p.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={p.title} />
                                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '2rem' }}>📷</div>
                                            }
                                        </div>
                                        <div style={{ padding: '12px' }}>
                                            <p style={{ color: 'white', fontWeight: 700, fontSize: '0.82rem', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title || '—'}</p>
                                            <p style={{ color: '#555', fontSize: '0.65rem', margin: '0 0 4px' }}>/shop/{slugify(p.title)}</p>
                                            <p style={{ color: '#777', fontSize: '0.68rem', margin: '0 0 8px' }}>
                                                <span style={{ background: '#1a1a1a', padding: '2px 8px', borderRadius: '6px', color: '#aaa' }}>
                                                    {seller?.storeName || seller?.name || 'Master'}
                                                </span>
                                            </p>
                                            <p style={{ color: '#ccc', fontSize: '0.8rem', fontWeight: 800, margin: '0 0 10px' }}>S/ {Number(p.price || 0).toFixed(2)}</p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div onClick={async () => { const { setDoc, doc: fsDoc } = await import('firebase/firestore'); await setDoc(fsDoc(db, 'products', p.id), { published: !isPublished }, { merge: true }); }}
                                                    style={{ width: '36px', height: '20px', borderRadius: '10px', background: isPublished ? '#00b96b' : '#333', position: 'relative', cursor: 'pointer', transition: '0.3s', flexShrink: 0 }}>
                                                    <div style={{ position: 'absolute', top: '2px', left: isPublished ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: 'white', transition: '0.3s' }} />
                                                </div>
                                                <span style={{ color: isPublished ? '#00b96b' : '#555', fontSize: '0.68rem', fontWeight: 800 }}>{isPublished ? 'Publicado' : 'Sin publicar'}</span>
                                            </div>
                                        </div>
                                        <div style={{ position: 'absolute', top: '8px', right: '42px', zIndex: 2 }}>
                                            <button onClick={() => setEditingProduct(p)}
                                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                                                ✏️
                                            </button>
                                        </div>

                                        <button onClick={() => setSecurityModal({ show: true, title: '🗑️ ELIMINAR PRODUCTO', message: `¿Eliminar "${p.title}"?`, action: async () => { const { deleteDoc, doc: fsDoc } = await import('firebase/firestore'); await deleteDoc(fsDoc(db, 'products', p.id)); } })}
                                            style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,0,0,0.15)', border: 'none', color: '#ff4d4f', width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                                            🗑️
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── LIST VIEW ── */}
                    {invGlobalView === 'list' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {filteredProducts.map(p => {
                                const seller = users.find(u => u.id === p.userId);
                                const isPublished = (p as any).published;
                                return (
                                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'white', padding: '14px 18px', borderRadius: '16px', border: '1px solid #f0f0f0' }}>
                                        <img src={p.image} style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover', background: '#eee', flexShrink: 0 }} alt={p.title} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontWeight: 800, margin: 0, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</p>
                                            <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: '#aaa' }}>{seller?.storeName || seller?.name || 'Master'} · S/ {p.price}</p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                            <div onClick={async () => { const { setDoc, doc: fsDoc } = await import('firebase/firestore'); await setDoc(fsDoc(db, 'products', p.id), { published: !isPublished }, { merge: true }); }}
                                                style={{ width: '36px', height: '20px', borderRadius: '10px', background: isPublished ? '#00b96b' : '#ddd', position: 'relative', cursor: 'pointer', transition: '0.3s' }}>
                                                <div style={{ position: 'absolute', top: '2px', left: isPublished ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: 'white', transition: '0.3s' }} />
                                            </div>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isPublished ? '#00b96b' : '#aaa', minWidth: '72px' }}>{isPublished ? 'Publicado' : 'Sin publicar'}</span>
                                            <button onClick={() => setEditingProduct(p)}
                                                style={{ background: '#f5f5f5', border: 'none', padding: '7px 12px', borderRadius: '10px', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer' }}>✏️ Editar</button>
                                            <button onClick={() => setSecurityModal({ show: true, title: '🗑️ ELIMINAR', message: `¿Eliminar "${p.title}"?`, action: async () => { const { deleteDoc, doc: fsDoc } = await import('firebase/firestore'); await deleteDoc(fsDoc(db, 'products', p.id)); } })}
                                                style={{ background: '#FFF1F0', color: '#CF1322', border: 'none', padding: '7px 12px', borderRadius: '10px', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer' }}>🗑️</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {filteredProducts.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>
                            <span style={{ fontSize: '3rem' }}>📦</span>
                            <p style={{ fontWeight: 700, marginTop: '15px' }}>Sin resultados para "{userSearch}"</p>
                        </div>
                    )}
                </div>
            )}

            {masterSubTab === 'stores' && (
                <div style={{ background: 'white', borderRadius: '30px', padding: '30px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                        <div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0 }}>Tiendas del Marketplace</h3>
                            <p style={{ margin: '5px 0 0', fontSize: '0.8rem', color: '#888' }}>{users.filter(u => u.role === 'socio').length} socio(s) · {products.length} productos en total</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* DELVA Global */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '20px', background: '#F6FFED', borderRadius: '20px', border: '1.5px solid #b7eb8f' }}>
                            <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🌿</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontWeight: 900, fontSize: '1rem' }}>DELVA Global</p>
                                <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#389E0D' }}>MASTER · {products.filter(p => !p.userId || p.userId === 'master').length} productos</p>
                            </div>
                            <span style={{ background: '#389E0D', color: 'white', padding: '5px 14px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 900, flexShrink: 0 }}>PRINCIPAL</span>
                        </div>

                        {/* Socios + Ghost stores */}
                        {storeUsers.map(u => (
                            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '20px', background: '#fafafa', borderRadius: '20px', border: `1px solid ${u.role !== 'socio' ? '#ffe7ba' : '#f0f0f0'}` }}>
                                <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: u.storeLogo ? 'transparent' : 'var(--secondary)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '1.2rem', flexShrink: 0 }}>
                                    {u.storeLogo ? <img src={u.storeLogo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : (u.initials || u.name?.charAt(0))}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <p style={{ margin: 0, fontWeight: 900, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.storeName || u.name}</p>
                                        {u.role !== 'socio' && <span style={{ background: '#FFF7E6', color: '#D46B08', fontSize: '0.62rem', fontWeight: 900, padding: '2px 8px', borderRadius: '8px', flexShrink: 0 }}>👻 FANTASMA</span>}
                                    </div>
                                    <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: '#888' }}>{u.email} · {products.filter(p => p.userId === u.id).length} productos · {u.role}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                    <button
                                        onClick={() => { setSelectedStoreId(u.id); setActiveTab('inventory'); }}
                                        style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>
                                        🕵️ ENTRAR
                                    </button>
                                    {u.role !== 'socio' && (
                                        <button
                                            onClick={() => setSecurityModal({ show: true, title: '⬆️ Restaurar', message: `¿Volver a activar la tienda de ${u.storeName || u.name} como socio?`, action: () => setDoc(doc(db, 'users', u.id), { role: 'socio' }, { merge: true }) })}
                                            style={{ background: '#F6FFED', color: '#389E0D', border: '1px solid #b7eb8f', padding: '8px 14px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer' }}>
                                            ACTIVAR
                                        </button>
                                    )}
                                    {u.role === 'socio' && (
                                        <button
                                            onClick={() => setSecurityModal({ show: true, title: '🚫 Revocar Acceso', message: `¿Convertir a ${u.name} en cliente?`, action: () => setDoc(doc(db, 'users', u.id), { role: 'customer' }, { merge: true }) })}
                                            style={{ background: '#FFF1F0', color: '#CF1322', border: '1px solid #FFA39E', padding: '8px 14px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer' }}>
                                            REVOCAR
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setSecurityModal({ 
                                            show: true, 
                                            title: '🗑️ Eliminar Tienda', 
                                            message: `¿Eliminar toda la información de la tienda de ${u.storeName || u.name}? Esto los bajará a cliente y borrará el nombre/logo de su tienda. (Los productos quedarán inactivos)`, 
                                            action: () => setDoc(doc(db, 'users', u.id), { role: 'customer', storeName: null, storeLogo: null, storeBio: null, storeBanner: null, city: null, waNumber: null, socials: null }, { merge: true }) 
                                        })}
                                        style={{ background: '#FFF', color: '#ff4d4f', border: '1px solid #ffccc7', padding: '8px 14px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer' }}>
                                        ELIMINAR
                                    </button>
                                </div>
                            </div>
                        ))}

                        {storeUsers.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ccc' }}>
                                <span style={{ fontSize: '3rem' }}>🏪</span>
                                <p style={{ fontWeight: 700, marginTop: '15px', color: '#aaa' }}>Aún no hay socios con tiendas activas.</p>
                                <p style={{ fontSize: '0.85rem', color: '#bbb' }}>Usa Invitaciones para añadir el primer socio.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {masterSubTab === 'invites' && (
                <div style={{ background: 'white', padding: '40px', borderRadius: '35px', boxShadow: 'var(--shadow-sm)', maxWidth: '500px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '10px' }}>Generar Invitación 🎫</h3>
                    <p style={{ fontSize: '0.9rem', opacity: 0.6, marginBottom: '30px' }}>Crea un link para dar de alta a un nuevo Socio (Dueño de Tienda).</p>
                    <button 
                        onClick={generateInvite} 
                        style={{ width: '100%', background: 'var(--accent)', color: 'white', padding: '18px', borderRadius: '20px', border: 'none', fontWeight: 900, fontSize: '1rem' }}
                    >
                        {inviteCopied ? '✅ LINK COPIADO' : '🔗 GENERAR LINK SOCIO'}
                    </button>
                    {generatedInviteLink && <p style={{ marginTop: '20px', fontSize: '0.7rem', color: 'var(--primary)', wordBreak: 'break-all', fontWeight: 700 }}>{generatedInviteLink}</p>}
                </div>
            )}

            {masterSubTab === 'shadow' && (
                <div style={{ background: 'white', padding: '40px', borderRadius: '35px', textAlign: 'center' }}>
                    <span style={{ fontSize: '3rem' }}>🕵️</span>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginTop: '20px' }}>Selector de Sombra</h3>
                    <p style={{ fontSize: '0.9rem', opacity: 0.6, maxWidth: '400px', margin: '10px auto 30px' }}>Mira el panel de administración exactamente como lo ve uno de tus socios.</p>
                    <select 
                        value={selectedStoreId} 
                        onChange={e => setSelectedStoreId(e.target.value)}
                        style={{ width: '100%', maxWidth: '300px', padding: '15px', borderRadius: '15px', border: '1px solid #ddd', fontSize: '1rem', fontWeight: 700 }}
                    >
                        <option value="master">Tienda DELVA Global</option>
                        {users.filter(u => u.role === 'socio').map(u => (
                            <option key={u.id} value={u.id}>{u.storeName || u.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* SECURITY MODAL */}
            {securityModal?.show && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 30000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'white', maxWidth: '400px', width: '100%', borderRadius: '35px', padding: '40px', textAlign: 'center' }}>
                         <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '15px' }}>{securityModal.title}</h2>
                         <p style={{ fontSize: '1rem', opacity: 0.7, marginBottom: '30px' }}>{securityModal.message}</p>
                         <div style={{ display: 'flex', gap: '10px' }}>
                             <button onClick={() => setSecurityModal(null)} style={{ flex: 1, padding: '15px', borderRadius: '15px', background: '#f5f5f5', border: 'none' }}>Cancelar</button>
                             <button onClick={() => { securityModal.action(); setSecurityModal(null); }} style={{ flex: 1, padding: '15px', borderRadius: '15px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 900 }}>Confirmar</button>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterPanel;
