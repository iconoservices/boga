'use client';

// Panel de Reclamaciones (Libro de Reclamaciones, D.S. 011-2011-PCM) — subruta
// propia, guard con useEsSuperadmin(). Lista las hojas, deja responder y
// marcar el estado. La respuesta se guarda acá; enviarla al correo del
// consumidor es todavía manual (ver /legal/libro-de-reclamaciones).

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useEsSuperadmin } from '@/lib/superadmin';
import SuperadminSubheader from '@/components/SuperadminSubheader';
import { codigoHoja, PLAZO_RESPUESTA_DIAS_HABILES } from '@/lib/reclamaciones';

type Row = Record<string, any>;
const ESTADOS = ['pendiente', 'respondido', 'cerrado'] as const;

export default function ReclamacionesAdmin() {
  const { esSuperadmin, cargando } = useEsSuperadmin();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [filtro, setFiltro] = useState<'todos' | (typeof ESTADOS)[number]>('todos');
  const [abierta, setAbierta] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState('');
  const [guardando, setGuardando] = useState(false);

  const recargar = useCallback(async () => {
    setCargandoDatos(true);
    const { data } = await supabase
      .from('reclamaciones')
      .select('*')
      .order('numero', { ascending: false });
    setRows(data ?? []);
    setCargandoDatos(false);
  }, []);

  useEffect(() => {
    if (!cargando && !esSuperadmin) router.replace('/login?redirect=/superadmin/reclamaciones');
  }, [cargando, esSuperadmin, router]);
  useEffect(() => { if (esSuperadmin) recargar(); }, [esSuperadmin, recargar]);

  if (cargando) return <div className="p-10 text-center text-sm text-[#6b7280]">Verificando acceso…</div>;
  if (!esSuperadmin) return null;

  const guardar = async (id: string, patch: Row) => {
    setGuardando(true);
    await supabase.from('reclamaciones').update(patch).eq('id', id);
    setGuardando(false);
    setAbierta(null);
    setRespuesta('');
    recargar();
  };

  const visibles = filtro === 'todos' ? rows : rows.filter((r) => r.estado === filtro);
  const pendientes = rows.filter((r) => r.estado === 'pendiente').length;

  return (
    <>
      <SuperadminSubheader title="Reclamaciones" icon="menu_book" />
      <div className="mx-auto max-w-[900px] px-4 py-6">
        <p className="mb-4 text-sm text-[#424754]">
          {rows.length} hoja(s) · <strong>{pendientes} pendiente(s)</strong>. Plazo de respuesta:{' '}
          {PLAZO_RESPUESTA_DIAS_HABILES} días hábiles.
        </p>

        <div className="mb-4 flex gap-2">
          {(['todos', ...ESTADOS] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                filtro === f ? 'bg-[#2170e4] text-white' : 'bg-[#e6e7f2] text-[#424754]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {cargandoDatos ? (
          <p className="text-sm text-[#6b7280]">Cargando…</p>
        ) : visibles.length === 0 ? (
          <p className="text-sm text-[#6b7280]">Sin hojas en este filtro.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {visibles.map((r) => {
              const open = abierta === r.id;
              return (
                <li key={r.id} className="rounded-lg border border-[#c2c6d6] bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#191b23]">{codigoHoja(r.numero)}</span>
                    <span className="rounded-full bg-[#eef1f8] px-2 py-0.5 text-[10px] font-bold uppercase text-[#424754]">{r.tipo}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      r.estado === 'pendiente' ? 'bg-[#fde8c8] text-[#8a5a00]' : r.estado === 'respondido' ? 'bg-[#dbe6fe] text-[#1d4ed8]' : 'bg-[#d3f1e4] text-[#0b6b3a]'
                    }`}>{r.estado}</span>
                    <span className="ml-auto text-[11px] text-[#6b7280]">
                      {new Date(r.created_at).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-semibold text-[#191b23]">
                    {r.con_nombre} · {r.con_email} {r.con_telefono ? `· ${r.con_telefono}` : ''}
                    {r.con_menor ? ` · menor (tutor: ${r.apoderado || '—'})` : ''}
                  </p>
                  <p className="text-xs text-[#6b7280]">
                    {r.bien === 'producto' ? 'Producto' : 'Servicio'}
                    {r.monto ? ` · S/ ${r.monto}` : ''} {r.bien_detalle ? `· ${r.bien_detalle}` : ''}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[#424754]">{r.detalle}</p>
                  {r.pedido && <p className="mt-1 text-sm text-[#424754]"><strong>Pide:</strong> {r.pedido}</p>}

                  {r.respuesta && (
                    <p className="mt-2 rounded bg-[#f3f6fc] p-2 text-sm text-[#1d4ed8]">
                      <strong>Respuesta:</strong> {r.respuesta}
                    </p>
                  )}

                  {open ? (
                    <div className="mt-3">
                      <textarea
                        className="w-full rounded-lg border border-[#c2c6d6] p-2 text-sm"
                        rows={3}
                        placeholder="Respuesta al consumidor…"
                        value={respuesta}
                        onChange={(e) => setRespuesta(e.target.value)}
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          disabled={guardando || !respuesta}
                          onClick={() => guardar(r.id, { respuesta, estado: 'respondido', respondido_at: new Date().toISOString() })}
                          className="rounded-lg bg-[#2170e4] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                        >
                          Guardar respuesta
                        </button>
                        <button onClick={() => { setAbierta(null); setRespuesta(''); }} className="rounded-lg bg-[#e6e7f2] px-3 py-1.5 text-xs font-bold text-[#424754]">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => { setAbierta(r.id); setRespuesta(r.respuesta || ''); }}
                        className="rounded-lg bg-[#e6e7f2] px-3 py-1.5 text-xs font-bold text-[#424754]"
                      >
                        {r.respuesta ? 'Editar respuesta' : 'Responder'}
                      </button>
                      {r.estado !== 'cerrado' && (
                        <button
                          onClick={() => guardar(r.id, { estado: 'cerrado' })}
                          className="rounded-lg bg-[#e6e7f2] px-3 py-1.5 text-xs font-bold text-[#424754]"
                        >
                          Marcar cerrado
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
