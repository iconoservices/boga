'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product } from '@/lib/data/products';
import { useApp } from '@/lib/context/AppContext';
import { type Sale, type Expense, type FixedExpense } from '@/lib/types';

interface FinancialDashboardProps {
    storeProducts: Product[];
    effectiveStoreId: string;
    isMaster?: boolean;
    isSocio?: boolean;
}

// ── Constants ───────────────────────────────────────────────────────────────
const PAYMENT_LABELS: Record<string, string> = { efectivo: '💵 Efectivo', yape: '🟣 Yape/Plin', pos: '💳 POS', transferencia: '🏦 Transf.', credito: '📅 Crédito' };
const EXPENSE_CATS = ['📦 Insumos', '🚗 Movilidad', '📱 Marketing', '🏭 Proveedor', '⚡ Servicios', '📋 Otros'];
const fmt = (n: number) => `S/ ${n.toFixed(2)}`;

// ── Date helpers ─────────────────────────────────────────────────────────────
const getDate = (val: any): Date | null => { if (!val) return null; if (val instanceof Date) return val; if (typeof val.toDate === 'function') return val.toDate(); return null; };
const isToday = (d: Date) => { const n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate(); };
const isThisWeek = (d: Date) => { const n = new Date(); const s = new Date(n); s.setDate(n.getDate() - n.getDay()); s.setHours(0, 0, 0, 0); return d >= s; };
const isThisMonth = (d: Date) => { const n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth(); };
type Period = 'today' | 'week' | 'month' | 'all';
const PL: Record<Period, string> = { today: 'Hoy', week: 'Semana', month: 'Mes', all: 'Todo' };

// ═══════════════════════════════════════════════════════════════════════════
export default function FinancialDashboard({ storeProducts, effectiveStoreId, isMaster, isSocio }: FinancialDashboardProps) {
    const { sales, expenses, fixedExpenses, loadingFinancials: loadingSales } = useApp();
    const canSeeFinancials = isMaster || isSocio;
    const [period, setPeriod] = useState<Period>('today');
    const [hideSensitive, setHideSensitive] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'flujo' | 'capital' | 'tendencias'>('general');

    // Expense form state
    const [expLabel, setExpLabel] = useState('');
    const [expAmount, setExpAmount] = useState('');
    const [expCat, setExpCat] = useState(EXPENSE_CATS[0]);
    const [savingExp, setSavingExp] = useState(false);

    // Fixed expense form state
    const [showFixedForm, setShowFixedForm] = useState(false);
    const [fixLabel, setFixLabel] = useState('');
    const [fixAmount, setFixAmount] = useState('');
    const [fixPeriod, setFixPeriod] = useState<'daily' | 'monthly'>('monthly');
    const [savingFix, setSavingFix] = useState(false);
    const [monthlyNotes, setMonthlyNotes] = useState<Record<string, string>>({});

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
        // Load monthly notes once
        const fetchNotes = async () => {
            const { getDocs, query, collection } = await import('firebase/firestore');
            const q = query(collection(db, 'monthlyNotes'));
            const snap = await getDocs(q);
            const mapped: Record<string, string> = {};
            snap.forEach(doc => { mapped[doc.id] = doc.data().note || ''; });
            setMonthlyNotes(mapped);
        };
        fetchNotes();
    }, []);

    // ── FILTERED DATA ─────────────────────────────────────────────────────
    const filteredSales = useMemo(() => sales.filter(s => { const d = getDate(s.createdAt); if (!d) return period === 'all'; if (period === 'today') return isToday(d); if (period === 'week') return isThisWeek(d); if (period === 'month') return isThisMonth(d); return true; }), [sales, period]);
    const filteredExpenses = useMemo(() => expenses.filter(e => { const d = getDate(e.createdAt); if (!d) return period === 'all'; if (period === 'today') return isToday(d); if (period === 'week') return isThisWeek(d); if (period === 'month') return isThisMonth(d); return true; }), [expenses, period]);

    // ── Fixed expenses contribution for the selected period ───────────────
    const fixedExpensesTotal = useMemo(() => {
        return fixedExpenses.reduce((acc, fe) => {
            if (fe.period === 'daily') {
                const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 30;
                return acc + Number(fe.amount) * days;
            }
            if (fe.period === 'monthly') {
                const months = period === 'today' ? 1 / 30 : period === 'week' ? 7 / 30 : period === 'month' ? 1 : 1;
                return acc + Number(fe.amount) * months;
            }
            return acc;
        }, 0);
    }, [fixedExpenses, period]);

    // ── KPI Calculations ──────────────────────────────────────────────────
    const kpis = useMemo(() => {
        const totalRevenue = filteredSales.reduce((a, s) => a + Number(s.total || 0), 0);
        const salesCount = filteredSales.length;
        const aov = salesCount > 0 ? totalRevenue / salesCount : 0;
        let grossProfit = 0; let hasCostData = false;
        filteredSales.forEach(s => (s.items || []).forEach(i => { if (i.costPrice != null) { hasCostData = true; grossProfit += (Number(i.price) - Number(i.costPrice)) * i.qty; } }));
        const variableExpenses = filteredExpenses.reduce((a, e) => a + Number(e.amount || 0), 0);
        const totalExpenses = variableExpenses + fixedExpensesTotal;
        const netProfit = grossProfit - totalExpenses;
        const grossPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
        const netPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
        const published = storeProducts.filter(p => (p as any).published !== false);
        const outOfStock = published.filter(p => Number((p as any).stock ?? 0) <= 0).length;
        let invInvest = 0; let invProfit = 0; let withCost = 0; let invGross = 0; let totalStockUnsold = 0;
        storeProducts.forEach(p => { 
            const s = Number((p as any).stock ?? 0); 
            if (s > 0) {
                totalStockUnsold += s;
                invGross += Number(p.price || 0) * s;
                if (p.costPrice != null) { 
                    withCost++; 
                    invInvest += Number(p.costPrice) * s; 
                    invProfit += (Number(p.price || 0) - Number(p.costPrice)) * s; 
                } 
            }
        });
        const noSku = storeProducts.filter(p => !p.sku).length;
        const noCost = storeProducts.filter(p => p.costPrice == null).length;
        const noImg = storeProducts.filter(p => !p.image).length;
        const noStock = storeProducts.filter(p => (p as any).stock == null || (p as any).stock === 0).length;
        const lowMargin = storeProducts.filter(p => p.costPrice != null && Number(p.price) > 0 && ((Number(p.price) - Number(p.costPrice!)) / Number(p.price)) * 100 < 20).length;
        return { totalRevenue, salesCount, aov, grossProfit, netProfit, totalExpenses, variableExpenses, fixedExpensesTotal, hasCostData, grossPct, netPct, outOfStock, published: published.length, invInvest, invProfit, invGross, totalStockUnsold, withCost, noSku, noCost, noImg, noStock, lowMargin };
    }, [filteredSales, filteredExpenses, fixedExpensesTotal, storeProducts]);

    const topByMargin = useMemo(() => storeProducts.filter(p => p.costPrice != null && Number(p.price) > 0).map(p => ({ ...p, margin: Number(p.price) - Number(p.costPrice!), marginPct: ((Number(p.price) - Number(p.costPrice!)) / Number(p.price)) * 100 })).sort((a, b) => b.marginPct - a.marginPct).slice(0, 5), [storeProducts]);

    const topBySales = useMemo(() => {
        const counts: Record<string, { id: string, title: string, qty: number }> = {};
        filteredSales.forEach(s => (s.items || []).forEach(i => {
            const pid = i.productId;
            if (!counts[pid]) counts[pid] = { id: pid, title: i.title, qty: 0 };
            counts[pid].qty += i.qty;
        }));
        return Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 5);
    }, [filteredSales]);

    const S = (v: string) => hideSensitive ? '••••' : v;

    const saveExpense = async () => {
        if (!expLabel.trim() || !expAmount) return;
        setSavingExp(true);
        try { await addDoc(collection(db, 'expenses'), { label: expLabel.trim(), amount: Number(expAmount), category: expCat, storeId: effectiveStoreId, createdAt: new Date() }); setExpLabel(''); setExpAmount(''); } finally { setSavingExp(false); }
    };

    const saveFixed = async () => {
        if (!fixLabel.trim() || !fixAmount) return;
        setSavingFix(true);
        try { await addDoc(collection(db, 'fixedExpenses'), { label: fixLabel.trim(), amount: Number(fixAmount), period: fixPeriod, storeId: effectiveStoreId }); setFixLabel(''); setFixAmount(''); setShowFixedForm(false); } finally { setSavingFix(false); }
    };

    const saveMonthlyNote = async (key: string, note: string) => {
        const { doc, setDoc } = await import('firebase/firestore');
        setMonthlyNotes(prev => ({ ...prev, [key]: note }));
        await setDoc(doc(db, 'monthlyNotes', key), { note, updatedAt: new Date() }, { merge: true });
    };

    const KCard = ({ emoji, label, main, sub, color, bg }: { emoji: string; label: string; main: string; sub?: string; color: string; bg: string }) => (
        <div style={{ background: bg, borderRadius: '18px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.2rem' }}>{emoji}</span>
                <span style={{ fontSize: '0.55rem', fontWeight: 900, color, background: `${color}18`, padding: '2px 6px', borderRadius: '6px', letterSpacing: '0.5px' }}>{label}</span>
            </div>
            <p style={{ fontSize: '1.35rem', fontWeight: 900, color, margin: 0, lineHeight: 1.1 }}>{main}</p>
            {sub && <p style={{ fontSize: '0.64rem', color: '#888', margin: 0, fontWeight: 600 }}>{sub}</p>}
        </div>
    );

    // ── Monthly Stats (Historical Trends) ───────────────────────────────
    const monthlyStats = useMemo(() => {
        const stats: Record<string, { month: string, year: number, revenue: number, expenses: number, profit: number, count: number }> = {};
        
        sales.forEach(s => {
            const d = getDate(s.createdAt);
            if (!d) return;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!stats[key]) stats[key] = { month: d.toLocaleString('es-PE', { month: 'short' }), year: d.getFullYear(), revenue: 0, expenses: 0, profit: 0, count: 0 };
            
            const rev = Number(s.total || 0);
            stats[key].revenue += rev;
            stats[key].count++;
            
            let gp = 0;
            (s.items || []).forEach(i => { if (i.costPrice != null) gp += (Number(i.price) - Number(i.costPrice)) * i.qty; });
            stats[key].profit += gp;
        });

        expenses.forEach(e => {
            const d = getDate(e.createdAt);
            if (!d) return;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (stats[key]) {
                const amt = Number(e.amount || 0);
                stats[key].expenses += amt;
                stats[key].profit -= amt;
            }
        });

        return Object.entries(stats)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([key, val]) => ({ key, ...val }));
    }, [sales, expenses]);

    // ── Comparison with Previous Month ──────────────────────────────────
    const comparison = useMemo(() => {
        if (monthlyStats.length < 2) return null;
        const curr = monthlyStats[0];
        const prev = monthlyStats[1];
        const revGrowth = prev.revenue > 0 ? ((curr.revenue - prev.revenue) / prev.revenue) * 100 : 0;
        const profGrowth = prev.profit > 0 ? ((curr.profit - prev.profit) / prev.profit) * 100 : 0;
        return { revGrowth, profGrowth, lastMonth: prev.month };
    }, [monthlyStats]);

    // ── Rotation & JIT Calculations ──────────────────────────────────────
    const jitData = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const last30Sales = sales.filter(s => {
            const d = getDate(s.createdAt);
            return d && d >= thirtyDaysAgo;
        });

        const velocityMap: Record<string, number> = {};
        last30Sales.forEach(s => {
            (s.items || []).forEach(i => {
                velocityMap[i.productId] = (velocityMap[i.productId] || 0) + i.qty;
            });
        });

        const urgent: any[] = [];
        const stagnant: any[] = [];

        storeProducts.forEach(p => {
            const stock = Number((p as any).stock || 0);
            const sold30 = velocityMap[p.id] || 0;
            const dailyRate = sold30 / 30;
            
            if (sold30 > 0 && stock > 0) {
                const daysLeft = stock / dailyRate;
                const freqDays = 30 / sold30;
                const frequencyLabel = freqDays < 1 ? `Cada ${(freqDays * 24).toFixed(0)}h` : `Cada ${freqDays.toFixed(1)}d`;
                
                if (daysLeft <= 15) {
                    urgent.push({ ...p, daysLeft, sold30, stock, frequencyLabel });
                }
            } else if (stock > 0 && sold30 === 0) {
                stagnant.push({ ...p, stock, value: stock * Number(p.costPrice || 0) });
            }
        });

        return {
            urgent: urgent.sort((a, b) => a.daysLeft - b.daysLeft),
            stagnant: stagnant.sort((a, b) => b.value - a.value)
        };
    }, [sales, storeProducts]);

    // ══════════════════════════════════════════════════════════════════════
    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* ── HEADER ─────────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, color: 'var(--primary)' }}>Dashboard Financiero 📊</h2>
                    <p style={{ fontSize: '0.68rem', color: '#888', margin: '2px 0 0' }}>
                        Tiempo real · {isMounted ? new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '2px', background: '#f5f5f5', padding: '3px', borderRadius: '11px' }}>
                        {(['today', 'week', 'month', 'all'] as Period[]).map(p => (
                            <button key={p} onClick={() => setPeriod(p)} style={{ padding: '5px 10px', borderRadius: '9px', border: 'none', background: period === p ? 'white' : 'transparent', color: period === p ? 'var(--primary)' : '#aaa', fontWeight: 800, fontSize: '0.65rem', cursor: 'pointer', transition: 'all 0.15s' }}>{PL[p]}</button>
                        ))}
                    </div>
                    {canSeeFinancials && (
                        <button onClick={() => setHideSensitive(h => !h)} style={{ width: '34px', height: '34px', borderRadius: '10px', border: '1.5px solid #eee', background: hideSensitive ? '#fff3f3' : 'white', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {hideSensitive ? '🙈' : '👁️'}
                        </button>
                    )}
                </div>
            </div>

            {/* ── TABS NAVEGACIÓN ────────────────────────────────────── */}
            {canSeeFinancials && (
                <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #f0f0f0', paddingBottom: '12px', marginTop: '4px', overflowX: 'auto' }}>
                    {(['general', 'flujo', 'capital', 'tendencias'] as const).map(t => (
                        <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '8px 18px', borderRadius: '12px', background: activeTab === t ? 'var(--primary)' : 'white', border: activeTab === t ? '2px solid var(--primary)' : '2px solid #eee', color: activeTab === t ? 'white' : '#888', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                            {t === 'general' ? '📊 Resumen General' : t === 'flujo' ? '💸 Flujo y Gastos' : t === 'tendencias' ? '📈 Tendencias' : '📦 Capital en Tienda'}
                        </button>
                    ))}
                </div>
            )}

            {/* ── MAIN 2-COLUMN LAYOUT ────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '14px', alignItems: 'start' }}>

                {/* ════════ LEFT COLUMN ════════ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    {/* ── TAB: GENERAL ── */}
                    {activeTab === 'general' && (
                        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* KPI CARDS (Realized Money vs Asset) */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                                <KCard emoji="💰" label="VENTAS" main={S(fmt(kpis.totalRevenue))} sub={`${kpis.salesCount} venta${kpis.salesCount !== 1 ? 's' : ''} · ${PL[period]}`} color="#007AFF" bg="#F0F7FF" />
                                {canSeeFinancials && <KCard emoji="📈" label="UTILIDAD NETA" main={S(fmt(kpis.netProfit))} sub={kpis.hasCostData ? `Margen: ${S(kpis.netPct.toFixed(1) + '%')} · Bruto: ${S(kpis.grossPct.toFixed(1) + '%')}` : 'Agrega costos a productos'} color={kpis.netProfit >= 0 ? '#52c41a' : '#ff4d4f'} bg={kpis.netProfit >= 0 ? '#F6FFED' : '#FFF1F0'} />}
                                {canSeeFinancials && <KCard emoji="📦" label="RETAIL POTENCIAL" main={S(fmt(kpis.invGross))} sub={`Asumiendo venta total del stock actual`} color="#722ed1" bg="#F9F0FF" /> }
                                {canSeeFinancials && <KCard emoji="💵" label="CAPITAL HUNDIDO" main={S(fmt(kpis.invInvest))} sub={`Ganancia Base: ${S(fmt(kpis.invProfit))}`} color="#fa8c16" bg="#FFF7E6" />}
                            </div>

                            {/* TOP RANKINGS */}
                            {canSeeFinancials && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                                    
                                    {/* TOP 5 MÁS VENDIDOS */}
                                    <div style={{ background: 'white', borderRadius: '18px', padding: '14px 16px', border: '1px solid #f0f0f0' }}>
                                        <p style={{ fontSize: '0.62rem', fontWeight: 900, color: '#aaa', margin: '0 0 10px', letterSpacing: '0.5px' }}>🚀 TOP 5 MÁS VENDIDOS ({PL[period].toUpperCase()})</p>
                                        {topBySales.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '12px', color: '#ccc' }}>
                                                <p style={{ margin: 0, fontSize: '1.2rem' }}>📭</p>
                                                <p style={{ fontSize: '0.72rem', marginTop: '6px' }}>Sin ventas registradas</p>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {topBySales.map((p, i) => (
                                                    <div key={p.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 10px', background: i === 0 ? '#f0f7ff' : '#fafafa', borderRadius: '10px', border: i === 0 ? '1px solid #bae0ff' : 'none' }}>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: i === 0 ? '#1890ff' : '#ccc', minWidth: '20px' }}>#{i + 1}</span>
                                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                                            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                                                        </div>
                                                        <span style={{ fontSize: '0.8rem', color: '#1890ff', fontWeight: 900 }}>{p.qty} unids</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* TOP 5 POR MARGEN */}
                                    <div style={{ background: 'white', borderRadius: '18px', padding: '14px 16px', border: '1px solid #f0f0f0' }}>
                                        <p style={{ fontSize: '0.62rem', fontWeight: 900, color: '#aaa', margin: '0 0 10px', letterSpacing: '0.5px' }}>🏆 TOP 5 POR RENTABILIDAD (MARGEN %)</p>
                                        {topByMargin.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '12px', color: '#ccc' }}>
                                                <p style={{ margin: 0, fontSize: '1.2rem' }}>📋</p>
                                                <p style={{ fontSize: '0.72rem', marginTop: '6px' }}>Agrega costos</p>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {topByMargin.slice(0, 5).map((p, i) => (
                                                    <div key={p.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 10px', background: i === 0 ? '#fffbe6' : '#fafafa', borderRadius: '10px', border: i === 0 ? '1px solid #ffe58f' : 'none' }}>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: i === 0 ? '#fa8c16' : '#ccc', minWidth: '20px' }}>#{i + 1}</span>
                                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                                            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                                                        </div>
                                                        <span style={{ fontSize: '0.8rem', color: p.marginPct < 20 ? '#ff4d4f' : '#fa8c16', fontWeight: 900 }}>{hideSensitive ? '••%' : `${p.marginPct.toFixed(0)}%`}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TAB: FLUJO Y GASTOS ── */}
                    {activeTab === 'flujo' && (
                        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ background: 'white', borderRadius: '18px', padding: '14px 16px', border: '1px solid #f0f0f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <p style={{ fontSize: '0.62rem', fontWeight: 900, color: '#aaa', margin: 0, letterSpacing: '0.5px' }}>📋 HISTORIAL DE VENTAS ({PL[period].toUpperCase()})</p>
                                    <span style={{ fontSize: '0.62rem', fontWeight: 900, background: '#f5f5f5', color: '#555', padding: '2px 8px', borderRadius: '6px' }}>{kpis.salesCount} ventas</span>
                                </div>
                                {loadingSales ? (
                                    <div style={{ textAlign: 'center', padding: '30px', color: '#ccc' }}>⏳ Cargando...</div>
                                ) : filteredSales.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '30px', color: '#ccc' }}>
                                        <p style={{ fontSize: '2rem', margin: 0 }}>📭</p>
                                        <p style={{ fontSize: '0.9rem', marginTop: '10px', fontWeight: 700 }}>No hay ventas registradas en este período</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto auto auto', gap: '12px', padding: '0 8px 6px', borderBottom: '1px solid #eee' }}>
                                            {['HORA', 'PRODUCTOS', 'PAGO', 'TOTAL', canSeeFinancials ? 'UTILIDAD' : ''].map((h, i) => (
                                                <span key={i} style={{ fontSize: '0.55rem', fontWeight: 900, color: '#bbb', letterSpacing: '0.5px' }}>{h}</span>
                                            ))}
                                        </div>
                                        {filteredSales.map(sale => {
                                            const d = getDate(sale.createdAt);
                                            const profit = (sale.items || []).reduce((a, i) => i.costPrice != null ? a + (Number(i.price) - Number(i.costPrice)) * i.qty : a, 0);
                                            const hasCost = (sale.items || []).some(i => i.costPrice != null);
                                            return (
                                                <div key={sale.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto auto auto', gap: '12px', alignItems: 'center', padding: '10px 8px', background: '#fafafa', borderRadius: '12px', transition: 'background 0.1s', cursor: 'default' }}
                                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f0f7ff'}
                                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fafafa'}>
                                                    <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 700 }}>{d ? d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(sale.items || []).map(i => i.title).join(', ')}</span>
                                                    <span style={{ fontSize: '0.65rem', background: '#e0e0e0', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, color: '#444', whiteSpace: 'nowrap' }}>{PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod}</span>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--accent)', textAlign: 'right' }}>{S(fmt(Number(sale.total || 0)))}</span>
                                                    {canSeeFinancials && <span style={{ fontSize: '0.75rem', fontWeight: 900, color: hasCost ? '#52c41a' : '#ccc', textAlign: 'right' }}>{hasCost ? S(`+${fmt(profit)}`) : '—'}</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── TAB: CAPITAL Y SALUD ── */}
                    {activeTab === 'capital' && canSeeFinancials && (
                        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                {/* VALORACIÓN DE INVENTARIO */}
                                <div style={{ background: 'white', borderRadius: '18px', padding: '16px 20px', border: '1px solid #f0f0f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <h3 style={{ fontSize: '0.8rem', fontWeight: 900, color: '#333', margin: 0 }}>VALORACIÓN DE INVENTARIO</h3>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#1890ff', background: '#e6f7ff', padding: '3px 8px', borderRadius: '6px' }}>
                                            📦 {kpis.totalStockUnsold} unidades
                                        </span>
                                    </div>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f9f9f9', borderRadius: '10px', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#666' }}>Valor de Venta (Retail)</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#722ed1' }}>{S(fmt(kpis.invGross))}</span>
                                    </div>
                                    
                                    <div style={{ padding: '10px 14px', background: kpis.noCost > 0 ? '#fffbe6' : '#f6ffed', borderRadius: '10px', border: `1px solid ${kpis.noCost > 0 ? '#ffe58f' : '#b7eb8f'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#666' }}>Costo de Adquisición</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#fa8c16' }}>{S(fmt(kpis.invInvest))}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#666' }}>Utilidad Bruta Proyectada</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#52c41a' }}>{S(fmt(kpis.invProfit))}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* SALUD DE DATOS */}
                                <div style={{ background: 'white', borderRadius: '18px', padding: '16px 20px', border: '1px solid #f0f0f0' }}>
                                    <p style={{ fontSize: '0.62rem', fontWeight: 900, color: '#aaa', margin: '0 0 14px', letterSpacing: '0.5px' }}>🩺 SALUD DE DATOS</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {[
                                            { label: 'Sin SKU', count: kpis.noSku, icon: '🏷️', c: '#fa8c16' },
                                            { label: 'Sin costo registrado', count: kpis.noCost, icon: '💲', c: '#ff4d4f' },
                                            { label: 'Sin imagen', count: kpis.noImg, icon: '🖼️', c: '#fa8c16' },
                                            { label: 'Sin stock definido', count: kpis.noStock, icon: '📦', c: '#ff4d4f' },
                                            { label: 'Margen bajo (<20%)', count: kpis.lowMargin, icon: '⚠️', c: '#faad14' },
                                        ].map(({ label, count, icon, c }) => (
                                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: count > 0 ? `${c}10` : '#f6ffed', borderRadius: '10px', border: `1px solid ${count > 0 ? c + '30' : '#b7eb8f'}` }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555' }}>{icon} {label}</span>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: count > 0 ? c : '#52c41a' }}>{count > 0 ? count : '✓'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* ── PLANIFICADOR JIT (REPOSICIÓN Y ROTACIÓN) ── */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '14px' }}>
                                
                                {/* A. REPOSICIÓN URGENTE (JIT) */}
                                <div style={{ background: 'white', borderRadius: '18px', padding: '18px', border: '1px solid #f0f0f0' }}>
                                    <h3 style={{ fontSize: '0.8rem', fontWeight: 900, color: '#333', margin: '0 0 12px' }}>⚡ PLANIFICADOR JIT: REPOSICIÓN</h3>
                                    {jitData.urgent.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '30px', color: '#ccc', background: '#fafafa', borderRadius: '12px' }}>
                                            <p style={{ fontSize: '1.5rem', margin: 0 }}>✅</p>
                                            <p style={{ fontSize: '0.7rem', marginTop: '6px' }}>Stock saludable para los próximos 15 días</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 70px', gap: '10px', padding: '0 10px 4px' }}>
                                                <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#aaa' }}>PRODUCTO</span>
                                                <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#aaa', textAlign: 'center' }}>STOCK</span>
                                                <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#aaa', textAlign: 'right' }}>COBERTURA</span>
                                            </div>
                                            {jitData.urgent.map(p => {
                                                const isCritical = p.daysLeft <= 7;
                                                return (
                                                    <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 70px', gap: '10px', alignItems: 'center', padding: '10px', background: isCritical ? '#fff1f0' : '#fffbe6', borderRadius: '12px', border: `1px solid ${isCritical ? '#ffa39e' : '#ffe58f'}` }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                                                            <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#888' }}>🚀 {p.frequencyLabel}</span>
                                                        </div>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#555', textAlign: 'center' }}>{p.stock}</span>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: isCritical ? '#cf1322' : '#d48806' }}>{Math.ceil(p.daysLeft)} días</span>
                                                            <p style={{ fontSize: '0.55rem', margin: 0, fontWeight: 700, color: isCritical ? '#ff4d4f' : '#b88c00' }}>{isCritical ? '¡PEDIR YA!' : 'Pronto'}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* B. INVENTARIO SIN MOVIMIENTO (Mide por unidades y Soles) */}
                                <div style={{ background: 'white', borderRadius: '18px', padding: '18px', border: '1px solid #f0f0f0' }}>
                                    <h3 style={{ fontSize: '0.8rem', fontWeight: 900, color: '#333', margin: '0 0 12px' }}>🧊 INVENTARIO SIN MOVIMIENTO (ÚLTIMOS 30D)</h3>
                                    {jitData.stagnant.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '30px', color: '#ccc' }}>Todo el stock se está moviendo</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 100px', gap: '10px', padding: '0 10px 4px' }}>
                                                <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#aaa' }}>PRODUCTO</span>
                                                <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#aaa', textAlign: 'center' }}>UNIDS</span>
                                                <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#aaa', textAlign: 'right' }}>CAPITAL PARADO</span>
                                            </div>
                                            {jitData.stagnant.slice(0, 8).map(p => (
                                                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 100px', gap: '10px', alignItems: 'center', padding: '8px 10px', background: '#fafafa', borderRadius: '12px' }}>
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#888', textAlign: 'center' }}>{p.stock}</span>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#cf1322', textAlign: 'right' }}>{S(fmt(p.value))}</span>
                                                </div>
                                            ))}
                                            <p style={{ fontSize: '0.6rem', color: '#bbb', margin: '6px 0 0', textAlign: 'center' }}>* Solo muestra productos con stock &gt; 0 y cero ventas en 30 días.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── TAB: TENDENCIAS e HISTÓRICO ── */}
                    {activeTab === 'tendencias' && canSeeFinancials && (
                        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Comparison Cards */}
                            {comparison ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <div style={{ background: 'white', borderRadius: '18px', padding: '16px', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: comparison.revGrowth >= 0 ? '#f6ffed' : '#fff1f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                            {comparison.revGrowth >= 0 ? '📈' : '📉'}
                                        </div>
                                        <div>
                                            <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 900, color: '#aaa', letterSpacing: '0.5px' }}>INGRESOS VS. {comparison.lastMonth.toUpperCase()}</p>
                                            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: comparison.revGrowth >= 0 ? '#52c41a' : '#ff4d4f' }}>
                                                {comparison.revGrowth >= 0 ? '+' : ''}{comparison.revGrowth.toFixed(1)}% <span style={{ color: '#888', fontWeight: 600, fontSize: '0.75rem' }}>{comparison.revGrowth >= 0 ? 'de crecimiento' : 'de caída'}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ background: 'white', borderRadius: '18px', padding: '16px', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: comparison.profGrowth >= 0 ? '#f6ffed' : '#fff1f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                            {comparison.profGrowth >= 0 ? '💰' : '⚠️'}
                                        </div>
                                        <div>
                                            <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 900, color: '#aaa', letterSpacing: '0.5px' }}>UTILIDAD vs {comparison.lastMonth.toUpperCase()}</p>
                                            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: comparison.profGrowth >= 0 ? '#52c41a' : '#ff4d4f' }}>
                                                {comparison.profGrowth >= 0 ? '+' : ''}{comparison.profGrowth.toFixed(1)}% <span style={{ color: '#888', fontWeight: 600, fontSize: '0.75rem' }}>{comparison.profGrowth >= 0 ? 'más utilidad' : 'menos utilidad'}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ background: '#f5f5f5', borderRadius: '18px', padding: '20px', textAlign: 'center', color: '#888', fontSize: '0.75rem', fontWeight: 700 }}>
                                    Aún no hay suficientes meses de data para comparar. ¡Sigue adelante! 🚀
                                </div>
                            )}

                            {/* Performance Chart (CSS Bars) */}
                            <div style={{ background: 'white', borderRadius: '18px', padding: '18px', border: '1px solid #f0f0f0' }}>
                                <p style={{ fontSize: '0.62rem', fontWeight: 900, color: '#aaa', margin: '0 0 20px', letterSpacing: '0.5px' }}>🚀 GRÁFICO DE RENDIMIENTO (ÚLTIMOS 6 MESES)</p>
                                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '150px', padding: '0 10px', gap: '4px' }}>
                                    {monthlyStats.slice(0, 6).reverse().map(m => {
                                        const maxRev = Math.max(...monthlyStats.map(s => s.revenue), 1);
                                        const revHeight = (m.revenue / maxRev) * 100;
                                        const profHeight = (Math.max(m.profit, 0) / maxRev) * 100;
                                        return (
                                            <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', width: '100%', height: '100%' }}>
                                                    <div style={{ flex: 1, background: '#1890ff', height: `${revHeight}%`, borderRadius: '4px 4px 0 0', opacity: 0.8, transition: 'height 0.3s' }} title={`Ingresos: S/ ${m.revenue}`} />
                                                    <div style={{ flex: 1, background: '#52c41a', height: `${profHeight}%`, borderRadius: '4px 4px 0 0', opacity: 1, transition: 'height 0.3s' }} title={`Utilidad Neta: S/ ${m.profit}`} />
                                                </div>
                                                <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#888', textTransform: 'capitalize' }}>{m.month}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '16px', borderTop: '1px solid #f9f9f9', paddingTop: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#1890ff' }} />
                                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#666' }}>Ingresos Brutos</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#52c41a' }} />
                                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#666' }}>Utilidad Neta</span>
                                    </div>
                                </div>
                            </div>

                            {/* Historical Table */}
                            <div style={{ background: 'white', borderRadius: '18px', padding: '18px', border: '1px solid #f0f0f0' }}>
                                <h3 style={{ fontSize: '0.8rem', fontWeight: 900, color: '#333', margin: '0 0 16px' }}>HISTORIAL DE RENDIMIENTO MENSUAL</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '80px 100px 100px 1fr', gap: '12px', padding: '0 10px 8px', borderBottom: '1px solid #eee' }}>
                                        {['MES', 'INGRESOS', 'UTILIDAD', 'ESTRATEGIA / NOTA'].map(h => (
                                            <span key={h} style={{ fontSize: '0.55rem', fontWeight: 900, color: '#bbb', letterSpacing: '0.5px' }}>{h}</span>
                                        ))}
                                    </div>
                                    {monthlyStats.map(m => (
                                        <div key={m.key} style={{ display: 'grid', gridTemplateColumns: '80px 100px 100px 1fr', gap: '12px', alignItems: 'center', padding: '12px 10px', background: '#fafafa', borderRadius: '12px' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--primary)', textTransform: 'capitalize' }}>{m.month} {m.year}</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#333' }}>{S(fmt(m.revenue))}</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: m.profit >= 0 ? '#52c41a' : '#ff4d4f' }}>{S(fmt(m.profit))}</span>
                                            <div style={{ position: 'relative' }}>
                                                <input 
                                                    placeholder="Anotar estrategia..." 
                                                    style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #eee', fontSize: '0.7rem', outline: 'none', background: 'white' }}
                                                    defaultValue={monthlyNotes[m.key] || ''} 
                                                    onBlur={(e) => saveMonthlyNote(m.key, e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && (e.target as any).blur()}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ════════ RIGHT SIDEBAR ════════ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'sticky', top: '20px' }}>

                    {/* DENTRO DE FLUJO O GENERAL: RESUMEN FINANCIERO / GASTOS */}
                    {activeTab === 'general' && canSeeFinancials && (
                        <div className="fade-in" style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', borderRadius: '18px', padding: '20px' }}>
                            <p style={{ fontSize: '0.6rem', fontWeight: 900, color: 'rgba(255,255,255,0.4)', margin: '0 0 12px', letterSpacing: '0.5px' }}>💼 RESUMEN EJECUTIVO ({PL[period].toUpperCase()})</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Ingresos Brutos</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#40a9ff' }}>{S(fmt(kpis.totalRevenue))}</span>
                                </div>
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Gastos variables</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#ff7875' }}>{S(`-${fmt(kpis.variableExpenses)}`)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Gastos fijos</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#ffa940' }}>{S(`-${fmt(kpis.fixedExpensesTotal)}`)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.07)', padding: '10px', borderRadius: '10px', marginTop: '6px' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'white', fontWeight: 900 }}>Utilidad Neta</span>
                                    <span style={{ fontSize: '1rem', fontWeight: 900, color: kpis.netProfit >= 0 ? '#95de64' : '#ff7875' }}>{S(fmt(kpis.netProfit))}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'flujo' && canSeeFinancials && (
                        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* ➕ REGISTRAR GASTO */}
                            <div style={{ background: 'white', borderRadius: '18px', padding: '14px 16px', border: '1px solid #f0f0f0' }}>
                                <p style={{ fontSize: '0.58rem', fontWeight: 900, color: '#aaa', margin: '0 0 10px', letterSpacing: '0.5px' }}>➕ REGISTRAR GASTO HOY</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                                    <input value={expLabel} onChange={e => setExpLabel(e.target.value)} placeholder="Descripción del gasto..." style={{ padding: '8px 10px', borderRadius: '10px', border: '1.5px solid #eee', fontSize: '0.78rem', outline: 'none', width: '100%', boxSizing: 'border-box' }} onKeyDown={e => e.key === 'Enter' && saveExpense()} />
                                    <select value={expCat} onChange={e => setExpCat(e.target.value)} style={{ padding: '7px 10px', borderRadius: '10px', border: '1.5px solid #eee', fontSize: '0.75rem', width: '100%', boxSizing: 'border-box' }}>
                                        {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <input value={expAmount} onChange={e => setExpAmount(e.target.value)} placeholder="S/ Monto" type="number" style={{ flex: 1, padding: '8px 10px', borderRadius: '10px', border: '1.5px solid #eee', fontSize: '0.78rem', outline: 'none' }} onKeyDown={e => e.key === 'Enter' && saveExpense()} />
                                        <button onClick={saveExpense} disabled={savingExp || !expLabel || !expAmount} style={{ padding: '0 14px', borderRadius: '10px', border: 'none', background: !expLabel || !expAmount ? '#eee' : '#52c41a', color: !expLabel || !expAmount ? '#bbb' : 'white', fontWeight: 800, fontSize: '0.72rem', cursor: !expLabel || !expAmount ? 'default' : 'pointer' }}>
                                            {savingExp ? '...' : '✓'}
                                        </button>
                                    </div>
                                </div>

                                {/* Today's variable expenses list */}
                                {filteredExpenses.length > 0 && (
                                    <div style={{ marginTop: '10px', borderTop: '1px solid #f5f5f5', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {filteredExpenses.slice(0, 8).map(e => (
                                            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 6px', background: '#fafafa', borderRadius: '8px' }}>
                                                <span style={{ fontSize: '0.58rem', background: '#f0f0f0', padding: '1px 5px', borderRadius: '5px', color: '#666', flexShrink: 0 }}>{e.category.split(' ')[0]}</span>
                                                <span style={{ flex: 1, fontSize: '0.68rem', fontWeight: 600, color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.label}</span>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#ff4d4f', flexShrink: 0 }}>{S(`-${fmt(Number(e.amount))}`)} </span>
                                                <button onClick={() => deleteDoc(doc(db, 'expenses', e.id))} style={{ width: '18px', height: '18px', borderRadius: '5px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#ddd', fontSize: '0.65rem', flexShrink: 0 }}>✕</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 📌 GASTOS FIJOS */}
                            <div style={{ background: 'white', borderRadius: '18px', padding: '14px 16px', border: '1px solid #f0f0f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <p style={{ fontSize: '0.58rem', fontWeight: 900, color: '#aaa', margin: 0, letterSpacing: '0.5px' }}>📌 GASTOS FIJOS</p>
                                    <button onClick={() => setShowFixedForm(f => !f)} style={{ fontSize: '0.62rem', fontWeight: 800, padding: '3px 8px', borderRadius: '8px', border: 'none', background: showFixedForm ? '#fff1f0' : '#f0f7ff', color: showFixedForm ? '#ff4d4f' : '#007AFF', cursor: 'pointer' }}>
                                        {showFixedForm ? '✕' : '+ Agregar'}
                                    </button>
                                </div>

                                {showFixedForm && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px', padding: '10px', background: '#f9f9f9', borderRadius: '10px' }}>
                                        <input value={fixLabel} onChange={e => setExpLabel(e.target.value)} placeholder="Ej: Alquiler local" style={{ padding: '7px 10px', borderRadius: '8px', border: '1.5px solid #eee', fontSize: '0.75rem', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <input value={fixAmount} onChange={e => setFixAmount(e.target.value)} placeholder="S/ Monto" type="number" style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', border: '1.5px solid #eee', fontSize: '0.75rem', outline: 'none' }} />
                                            <select value={fixPeriod} onChange={e => setFixPeriod(e.target.value as any)} style={{ padding: '7px 6px', borderRadius: '8px', border: '1.5px solid #eee', fontSize: '0.68rem' }}>
                                                <option value="monthly">/mes</option>
                                                <option value="daily">/día</option>
                                            </select>
                                        </div>
                                        <button onClick={saveFixed} disabled={savingFix || !fixLabel || !fixAmount} style={{ padding: '7px', borderRadius: '8px', border: 'none', background: !fixLabel || !fixAmount ? '#eee' : 'var(--primary)', color: !fixLabel || !fixAmount ? '#bbb' : 'white', fontWeight: 800, fontSize: '0.72rem', cursor: !fixLabel || !fixAmount ? 'default' : 'pointer' }}>
                                            {savingFix ? 'Guardando...' : '✓ Guardar Fijo'}
                                        </button>
                                    </div>
                                )}

                                {fixedExpenses.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '12px', color: '#ddd' }}>
                                        <p style={{ fontSize: '0.72rem', margin: 0 }}>Sin gastos fijos</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        {fixedExpenses.map(fe => (
                                            <div key={fe.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', background: '#fff7e6', borderRadius: '8px', border: '1px solid #ffe58f' }}>
                                                <span style={{ flex: 1, fontSize: '0.7rem', fontWeight: 700, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fe.label}</span>
                                                <span style={{ fontSize: '0.62rem', color: '#aaa', flexShrink: 0 }}>{fe.period === 'monthly' ? '/mes' : '/día'}</span>
                                                <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#fa8c16', flexShrink: 0 }}>{S(fmt(Number(fe.amount)))}</span>
                                                <button onClick={() => deleteDoc(doc(db, 'fixedExpenses', fe.id))} style={{ width: '16px', height: '16px', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#ddd', fontSize: '0.6rem', flexShrink: 0 }}>✕</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
