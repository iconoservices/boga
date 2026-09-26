'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Panel «Cobro online con tarjeta / Yape (Izipay)» de una tienda. El dinero va directo a la cuenta Izipay del comercio.
// Las claves se envían al servidor, se guardan cifradas y no se vuelven a mostrar (solo se sabe si están puestas).
// Ver src/app/api/pagos/config/route.ts. Solo aparece si el superadmin prendió el módulo «pasarela_pago» de la tienda.

type Estado = {
  modulo: boolean;
  cifradoListo: boolean;
  activo: boolean;
  username: string;
  publicKey: string;
  tienePassword: boolean;
  tieneHmac: boolean;
  modo: 'prueba' | 'produccion' | 'desconocido' | null;
  ipnUrl: string;
};

const campo = 'w-full px-3.5 py-3 bg-gray-50 border border-gray-200 rounded-md font-medium text-sm focus:bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all';

export default function CobroOnline({ slug }: { slug: string }) {
  const [est, setEst] = useState<Estado | null>(null);
  const [error, setError] = useState('');
  const [f, setF] = useState({ username: '', publicKey: '', password: '', hmac: '' });
  const [activo, setActivo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const token = async () => (await supabase.auth.getSession()).data.session?.access_token ?? '';

  const cargar = useCallback(async () => {
    setError('');
    try {
      const r = await fetch(`/api/pagos/config?store=${encodeURIComponent(slug)}`, { headers: { Authorization: `Bearer ${await token()}` }, cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'No se pudo cargar'); return; }
      setEst(d);
      setActivo(d.activo);
      setF({ username: d.username, publicKey: d.publicKey, password: '', hmac: '' });
    } catch { setError('No se pudo cargar'); }
  }, [slug]);
  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (probar: boolean) => {
    setGuardando(true); setAviso(null);
    try {
      const r = await fetch('/api/pagos/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ store: slug, activo, username: f.username, publicKey: f.publicKey, password: f.password, hmac: f.hmac, probar }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setAviso({ ok: false, texto: d.error || 'No se pudo guardar' }); }
      else {
        setAviso(d.prueba ? { ok: d.prueba.ok, texto: d.prueba.mensaje } : { ok: true, texto: 'Guardado.' });
        await cargar();
        // Al guardar, la tienda deja de ofrecer (o empieza a ofrecer) el pago online: se refresca la copia guardada del servidor.
        fetch('/api/revalidate-store', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ slug }) }).catch(() => {});
      }
    } catch { setAviso({ ok: false, texto: 'No se pudo guardar' }); }
    setGuardando(false);
  };

  const copiar = async () => {
    if (!est) return;
    try { await navigator.clipboard.writeText(est.ipnUrl); setCopiado(true); setTimeout(() => setCopiado(false), 1800); } catch { /* sin portapapeles */ }
  };

  if (error) return <p className="text-xs text-[#8c0009] font-semibold">{error}</p>;
  if (!est) return <div className="h-24 rounded-xl bg-gray-100 animate-pulse" />;

  const faltan = !f.username || !f.publicKey || (!f.password && !est.tienePassword) || (!f.hmac && !est.tieneHmac);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-lg bg-[#b8130e]/10 text-[#b8130e] flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[22px]">credit_card</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-gray-900">Cobro online con tarjeta o Yape (Izipay)</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Tus clientes pagan en tu tienda y el dinero llega directo a tu cuenta Izipay. Boga no toca tu dinero y el pedido pasa solo a «Pagado».
          </p>
        </div>
        {est.modo && est.modo !== 'desconocido' && (
          <span className={`shrink-0 text-[10px] font-extrabold uppercase px-2 py-1 rounded-full ${est.modo === 'produccion' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
            {est.modo === 'produccion' ? 'Producción' : 'Modo prueba'}
          </span>
        )}
      </div>

      {!est.cifradoListo && (
        <p className="text-xs font-semibold text-[#8c0009] bg-red-50 border border-red-100 rounded-md p-2.5">
          El servidor todavía no está listo para guardar claves. Avisa a Boga (falta configurar la llave de cifrado).
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Código de comercio / usuario</label>
          <input className={campo} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} autoComplete="off" placeholder="Ej. 12345678" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Clave pública</label>
          <input className={campo} value={f.publicKey} onChange={(e) => setF({ ...f, publicKey: e.target.value })} autoComplete="off" placeholder="12345678:testpublickey_…" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Clave de API (contraseña)</label>
          <input className={campo} type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" placeholder={est.tienePassword ? '•••••••• guardada (escribe para cambiarla)' : 'testpassword_… o prodpassword_…'} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Clave HMAC-SHA-256</label>
          <input className={campo} type="password" value={f.hmac} onChange={(e) => setF({ ...f, hmac: e.target.value })} autoComplete="new-password" placeholder={est.tieneHmac ? '•••••••• guardada (escribe para cambiarla)' : 'Clave HMAC de prueba o de producción'} />
        </div>
      </div>
      <p className="text-[11px] text-gray-500 -mt-1">Las 4 claves las ves en tu panel de Izipay (sección de claves de la API). Se guardan cifradas y no se vuelven a mostrar.</p>

      <div className="rounded-md bg-gray-50 border border-gray-200 p-3 space-y-2">
        <p className="text-xs font-bold text-gray-800">Aviso de pago (IPN) — un paso en tu panel de Izipay</p>
        <p className="text-[11px] text-gray-600">Copia esta dirección y pégala en tu panel de Izipay, en la regla de notificación «al final del pago». Así Boga se entera del pago aunque tu cliente cierre el navegador.</p>
        <div className="flex gap-2">
          <input readOnly value={est.ipnUrl} className={`${campo} !py-2 text-xs`} onFocus={(e) => e.currentTarget.select()} />
          <button type="button" onClick={copiar} className="shrink-0 px-3 rounded-md border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50">{copiado ? '¡Copiado!' : 'Copiar'}</button>
        </div>
      </div>

      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <span className="text-sm font-bold text-gray-800">Ofrecer «Pagar con tarjeta o Yape» en mi tienda</span>
        <button type="button" role="switch" aria-checked={activo} onClick={() => setActivo(!activo)} className={`relative w-11 h-6 rounded-full transition-colors ${activo ? 'bg-[#25D366]' : 'bg-gray-300'}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${activo ? 'translate-x-5' : ''}`} />
        </button>
      </label>
      {activo && faltan && <p className="text-xs font-semibold text-[#8c0009]">Para activarlo faltan claves.</p>}

      {aviso && (
        <p className={`text-xs font-semibold rounded-md p-2.5 border ${aviso.ok ? 'text-green-800 bg-green-50 border-green-100' : 'text-[#8c0009] bg-red-50 border-red-100'}`}>{aviso.texto}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={guardando || !est.cifradoListo} onClick={() => guardar(false)} className="px-4 py-2.5 rounded-md bg-[#b8130e] text-white text-sm font-bold disabled:opacity-50">
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" disabled={guardando || !est.cifradoListo || faltan} onClick={() => guardar(true)} className="px-4 py-2.5 rounded-md border border-gray-200 bg-white text-gray-800 text-sm font-bold disabled:opacity-50">
          Guardar y probar conexión
        </button>
      </div>
    </div>
  );
}
