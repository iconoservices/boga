'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface StoreInfo {
  slug: string;
  name: string;
  modulos?: {
    loyverse?: boolean;
    loyverse_token?: string;
    loyverse_last_sync?: string;
    [key: string]: any;
  } | null;
}

interface SyncStats {
  total: number;
  creados: number;
  actualizados: number;
  categoriasSincronizadas?: number;
  message?: string;
}

export default function LoyverseSyncModal({
  store,
  onClose,
  onSyncComplete,
}: {
  store: StoreInfo;
  onClose: () => void;
  onSyncComplete?: () => void;
}) {
  const [token, setToken] = useState<string>(store.modulos?.loyverse_token || '');
  const [showToken, setShowToken] = useState(false);
  const [syncStock, setSyncStock] = useState(true);
  const [updatePrices, setUpdatePrices] = useState(true);
  
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [stats, setStats] = useState<SyncStats | null>(null);

  const lastSyncDate = store.modulos?.loyverse_last_sync
    ? new Date(store.modulos.loyverse_last_sync).toLocaleString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const handleSaveToken = async () => {
    if (!token.trim()) {
      setErrorMsg('Por favor ingresa un token válido.');
      return;
    }

    setIsSavingToken(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const modulosActuales = store.modulos || {};
      const { error } = await supabase
        .from('stores')
        .update({
          modulos: {
            ...modulosActuales,
            loyverse: true,
            loyverse_token: token.trim(),
          },
        })
        .eq('slug', store.slug);

      if (error) throw error;
      setSuccessMsg('¡Token guardado exitosamente!');
    } catch (err: any) {
      setErrorMsg('Error al guardar el token: ' + (err.message || 'Intenta de nuevo'));
    } finally {
      setIsSavingToken(false);
    }
  };

  const handleSyncNow = async () => {
    const currentToken = token.trim();
    if (!currentToken) {
      setErrorMsg('Debes ingresar y guardar tu Token de Acceso de Loyverse antes de sincronizar.');
      return;
    }

    setIsSyncing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setStats(null);

    try {
      const res = await fetch('/api/loyverse/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeSlug: store.slug,
          token: currentToken,
          syncStock,
          updatePrices,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Ocurrió un error al sincronizar con Loyverse.');
      }

      setStats({
        total: data.total,
        creados: data.creados,
        actualizados: data.actualizados,
        categoriasSincronizadas: data.categoriasSincronizadas,
        message: data.message,
      });
      setSuccessMsg(data.message || 'Sincronización completada.');
      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[620px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3 bg-gradient-to-r from-red-50/50 via-white to-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#b8130e]/10 text-[#b8130e] flex items-center justify-center font-bold shadow-inner">
              <span className="material-symbols-outlined text-[24px]">sync_alt</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-gray-900">Integración Loyverse POS</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  API Gratuita
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Sincroniza tus productos y stock de <strong className="text-gray-700">{store.name}</strong> con tu caja física.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* Alertas */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[18px] shrink-0 text-red-500">error</span>
              <div>{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[18px] shrink-0 text-emerald-600">check_circle</span>
              <div>
                <p>{successMsg}</p>
                {stats && (
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center pt-2 border-t border-emerald-200/60">
                    <div className="bg-white/80 p-2 rounded-lg">
                      <span className="block text-[10px] text-emerald-700 font-bold uppercase">Procesados</span>
                      <strong className="text-sm text-emerald-950 font-black">{stats.total}</strong>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg">
                      <span className="block text-[10px] text-emerald-700 font-bold uppercase">Nuevos en Boga</span>
                      <strong className="text-sm text-emerald-950 font-black">+{stats.creados}</strong>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg">
                      <span className="block text-[10px] text-emerald-700 font-bold uppercase">Actualizados</span>
                      <strong className="text-sm text-emerald-950 font-black">{stats.actualizados}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Guía rápida */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-950">
              <span className="material-symbols-outlined text-[16px] text-amber-700">lightbulb</span>
              ¿Cómo obtener tu Token de Loyverse?
            </div>
            <ol className="list-decimal pl-4 space-y-0.5 text-[11px] text-amber-800">
              <li>Inicia sesión en <a href="https://loyverse.com" target="_blank" rel="noreferrer" className="underline font-bold text-amber-950">loyverse.com</a> con tu cuenta.</li>
              <li>En el menú lateral izquierdo ve a <strong>Configuración ➔ Tokens de acceso</strong>.</li>
              <li>Haz clic en <strong>Añadir token de acceso</strong> (nombre: <em>Boga Market</em>) y cópialo.</li>
            </ol>
          </div>

          {/* Campo de Token */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">
              Token de Acceso de Loyverse (Bearer API Token)
            </label>
            <div className="relative flex items-center">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Pega aquí tu token (ej. b3a49f809e2...)"
                className="w-full h-11 pl-3.5 pr-20 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-800 focus:outline-none focus:border-[#b8130e] focus:bg-white transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 px-2.5 py-1 text-[11px] font-bold text-gray-500 hover:text-gray-800 transition-colors"
              >
                {showToken ? 'Ocultar' : 'Ver'}
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-gray-400">
                {lastSyncDate ? `Última sincronización: ${lastSyncDate}` : 'Aún no se ha sincronizado.'}
              </span>
              <button
                type="button"
                onClick={handleSaveToken}
                disabled={isSavingToken || !token.trim()}
                className="text-xs font-bold text-[#b8130e] hover:underline disabled:opacity-50"
              >
                {isSavingToken ? 'Guardando...' : 'Guardar token'}
              </button>
            </div>
          </div>

          {/* Opciones de sincronización */}
          <div className="border border-gray-100 bg-gray-50/70 p-3.5 rounded-xl space-y-2.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Opciones de sincronización
            </h4>
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-800">
              <input
                type="checkbox"
                checked={syncStock}
                onChange={(e) => setSyncStock(e.target.checked)}
                className="w-4 h-4 rounded text-[#b8130e] focus:ring-[#b8130e] cursor-pointer"
              />
              <span>Sincronizar Stock / Inventario en tiempo real</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-800">
              <input
                type="checkbox"
                checked={updatePrices}
                onChange={(e) => setUpdatePrices(e.target.checked)}
                className="w-4 h-4 rounded text-[#b8130e] focus:ring-[#b8130e] cursor-pointer"
              />
              <span>Actualizar precios si cambiaron en la tablet de Loyverse</span>
            </label>
            <p className="text-[10px] text-gray-400 pl-6 leading-tight">
              * Nota: Las fotos que ya tengas subidas en Boga Market se preservarán intactas.
            </p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={isSyncing || !token.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#b8130e] text-white text-xs font-bold rounded-xl shadow-md shadow-[#b8130e]/20 hover:shadow-lg hover:shadow-[#b8130e]/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[18px] ${isSyncing ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>{isSyncing ? 'Sincronizando con Loyverse…' : 'Sincronizar Catálogo Ahora'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
