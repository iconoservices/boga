"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { RUTAS_DE_BOGAHUB } from '@/lib/rutasBoga';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface PlazaMessage {
  id: string | number;
  author: string;
  user_id?: string | null;
  role?: string;
  avatar_color: string;
  channel: string;
  text: string;
  likes: number;
  created_at?: string;
}

const CHANNELS = [
  { id: 'todos', label: '🔥 Todo', icon: 'local_fire_department' },
  { id: 'general', label: '# General', icon: 'forum' },
  { id: 'avisos', label: '# Avisos', icon: 'campaign' },
  { id: 'preguntas', label: '# Preguntas', icon: 'help_outline' },
  { id: 'comida', label: '# Comida & Bajona', icon: 'restaurant' },
];

const QUICK_PROMPTS = [
  '👋 ¡Buenas tardes gentita!',
  '🍲 ¿Qué recomiendan para comer hoy?',
  '🛵 ¿Cómo está el tráfico en la Basadre?',
  '🌅 ¿Alguien en Yarinacocha hoy?',
  '📢 Tengo un aviso para compartir',
];

const AVATAR_PALETTE = [
  'bg-emerald-600',
  'bg-blue-600',
  'bg-purple-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-teal-600',
  'bg-indigo-600',
];

function pickAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[idx];
}

// "juan carlos pérez" -> "Juan P."
function formatShortName(raw: string): string {
  const words = raw.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  if (words.length === 1) return cap(words[0]);
  return `${cap(words[0])} ${words[words.length - 1].charAt(0).toUpperCase()}.`;
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Reciente';
  try {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    return `Hace ${Math.floor(diff / 86400)} d`;
  } catch {
    return 'Reciente';
  }
}

const FALLBACK_MESSAGES: PlazaMessage[] = [
  {
    id: 1,
    author: 'Renzo M.',
    role: 'Vecino',
    avatar_color: 'bg-emerald-600',
    channel: 'general',
    text: '¡Buenas tardes gentita de Pucallpa! ¿Alguien sabe si el malecón Grau ya tiene actividad hoy?',
    likes: 4,
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 2,
    author: 'Gerson V.',
    role: 'Conductor',
    avatar_color: 'bg-blue-600',
    channel: 'preguntas',
    text: 'Paso libre por la Federico Basadre km 60, todo despejado y sin lluvia por ahora 🛵',
    likes: 9,
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: 3,
    author: 'Camila S.',
    role: 'Exploradora',
    avatar_color: 'bg-purple-600',
    channel: 'general',
    text: 'Qué lindo atardecer en Yarinacocha hoy día 🌅 Selva hermosa.',
    likes: 12,
    created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
];

export default function PlazaChatBubble() {
  const pathname = usePathname();
  const { user } = useAuth();

  const [enDireccionDeTienda, setEnDireccionDeTienda] = useState<boolean | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState('todos');
  const [messages, setMessages] = useState<PlazaMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [hasNewBadge, setHasNewBadge] = useState(true);
  const [likedIds, setLikedIds] = useState<(string | number)[]>([]);
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Detectar si estamos en un subdominio de tienda
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const partes = window.location.hostname.split('.');
      setEnDireccionDeTienda(
        partes.length > 2 && partes[0] !== 'www' && window.location.hostname.endsWith('.bogahub.app')
      );
    }
  }, []);

  // 2. Extraer nombre automático si el usuario está autenticado en BogaHub
  useEffect(() => {
    try {
      const savedName = localStorage.getItem('boga_user_nickname');
      if (savedName) {
        setAuthorName(savedName);
      } else if (user) {
        const metadataName =
          (user.user_metadata as any)?.name ||
          (user.user_metadata as any)?.full_name ||
          user.email?.split('@')[0] ||
          '';
        if (metadataName) {
          const formatted = formatShortName(metadataName);
          setAuthorName(formatted);
          localStorage.setItem('boga_user_nickname', formatted);
        }
      }

      const savedLikes = localStorage.getItem('boga_plaza_likes');
      if (savedLikes) {
        const parsed = JSON.parse(savedLikes);
        if (Array.isArray(parsed)) setLikedIds(parsed);
      }
    } catch {
      // storage seguro
    }
  }, [user]);

  // 3. Cargar mensajes reales desde Supabase y suscribirse a Realtime
  const cargarMensajes = useCallback(async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('plaza_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

      if (error || !data || data.length === 0) {
        // Si la tabla aún no se ha creado o está vacía, mostrar semillas para dar vida
        setMessages(FALLBACK_MESSAGES);
      } else {
        setMessages(data as PlazaMessage[]);
      }
    } catch {
      setMessages(FALLBACK_MESSAGES);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      cargarMensajes();

      // Suscribirse en tiempo real a nuevos mensajes entrantes
      const canal = supabase
        .channel('plaza_live_feed')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'plaza_messages' },
          (payload) => {
            const nuevo = payload.new as PlazaMessage;
            setMessages((prev) => {
              if (prev.some((m) => String(m.id) === String(nuevo.id))) return prev;
              return [...prev, nuevo];
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(canal);
      };
    }
  }, [isOpen, cargarMensajes]);

  // Scroll suave al último mensaje
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      setHasNewBadge(false);
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen, messages]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Mostrar únicamente en el Home / Portada de BogaHub
  if (pathname !== '/') return null;

  const primero = pathname.split('/')[1] || '';
  const enTienda = (primero !== '' && !RUTAS_DE_BOGAHUB.has(primero)) || primero === 'preview';
  if (enTienda || enDireccionDeTienda !== false) return null;

  // Filtrar mensajes por canal
  const filteredMessages =
    activeChannel === 'todos'
      ? messages
      : messages.filter((m) => m.channel === activeChannel);

  // Enviar un mensaje
  const handleSendMessage = async (customText?: string) => {
    const textBody = (customText || inputText).trim();
    if (!textBody || enviando) return;

    let finalAuthor = authorName.trim();
    if (!finalAuthor) {
      setIsEditingName(true);
      return;
    }
    finalAuthor = formatShortName(finalAuthor);

    const targetChannel = activeChannel === 'todos' ? 'general' : activeChannel;
    const tempId = `temp-${Date.now()}`;
    const avatarColor = pickAvatarColor(finalAuthor);

    // Mensaje optimista para respuesta instantánea (0ms)
    const optimista: PlazaMessage = {
      id: tempId,
      author: finalAuthor,
      user_id: user?.id || null,
      role: user ? 'Registrado' : 'Vecino',
      avatar_color: avatarColor,
      channel: targetChannel,
      text: textBody,
      likes: 0,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimista]);
    setInputText('');
    setEnviando(true);

    try {
      const { data, error } = await supabase
        .from('plaza_messages')
        .insert({
          author: finalAuthor,
          user_id: user?.id || null,
          role: user ? 'Registrado' : 'Vecino',
          avatar_color: avatarColor,
          channel: targetChannel,
          text: textBody,
          likes: 0,
        })
        .select()
        .single();

      if (!error && data) {
        // Reemplazar id optimista por el id real de la BD
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? (data as PlazaMessage) : m))
        );
      }
    } catch {
      // Si Supabase falla o la tabla no está creada, el mensaje se mantiene en pantalla local
    } finally {
      setEnviando(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    }
  };

  // Like interactivo
  const handleToggleLike = async (msg: PlazaMessage) => {
    const isLiked = likedIds.includes(msg.id);
    const newLikedIds = isLiked
      ? likedIds.filter((id) => id !== msg.id)
      : [...likedIds, msg.id];

    setLikedIds(newLikedIds);
    try {
      localStorage.setItem('boga_plaza_likes', JSON.stringify(newLikedIds));
    } catch {}

    const delta = isLiked ? -1 : 1;
    const updatedLikes = Math.max(0, (msg.likes || 0) + delta);

    // Actualización optimista
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, likes: updatedLikes } : m))
    );

    // Persistir en Supabase si tiene ID numérico
    if (typeof msg.id === 'number') {
      try {
        await supabase
          .from('plaza_messages')
          .update({ likes: updatedLikes })
          .eq('id', msg.id);
      } catch {}
    }
  };

  return (
    <>
      {/* 🔴 Botón Burbuja Flotante */}
      <aside aria-label="Plaza BogaHub" className="contents">
        <div
          className={`fixed z-40 transition-all duration-300 ${
            isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
          } bottom-[calc(80px+env(safe-area-inset-bottom)+12px)] right-4 sm:bottom-6 sm:right-6`}
        >
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Abrir Plaza BogaHub"
            className="group relative flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-primary via-[#d82a20] to-[#b3140c] text-white rounded-full shadow-[0_8px_25px_rgba(184,19,14,0.4)] hover:shadow-[0_12px_32px_rgba(184,19,14,0.6)] active:scale-95 transition-all duration-200 border border-white/20"
          >
            <div className="relative flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px] text-white">
                forum
              </span>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>

            <span className="font-bold text-xs tracking-wide hidden sm:inline">
              Plaza Pucallpa
            </span>

            {hasNewBadge && (
              <span className="bg-amber-400 text-amber-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-sm">
                EN VIVO
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* 💬 Ventana Modal / Drawer de Chat */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-end sm:justify-end pointer-events-none sm:p-6">
          {/* Backdrop oscurecido */}
          <div
            className="fixed inset-0 bg-black/55 backdrop-blur-[2px] pointer-events-auto transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <section
            aria-label="Plaza BogaHub Comunidad"
            className="relative z-10 pointer-events-auto w-full sm:w-[430px] h-[86vh] sm:h-[620px] max-h-[92vh] bg-white dark:bg-[#1a191d] border border-gray-200/80 dark:border-white/10 rounded-t-[32px] sm:rounded-3xl shadow-[0_-12px_45px_rgba(0,0,0,0.35)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-200"
          >
            {/* Tirador móvil */}
            <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-white dark:bg-[#1a191d]">
              <div className="w-11 h-1.2 rounded-full bg-gray-300 dark:bg-neutral-700" />
            </div>

            {/* Header del Chat */}
            <div className="bg-white dark:bg-[#1a191d] border-b border-gray-100 dark:border-white/10 px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-orange-500 text-white flex items-center justify-center shadow-sm shrink-0">
                  <span className="material-symbols-outlined text-[22px]">forum</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-[15px] text-gray-900 dark:text-white tracking-tight">
                      Plaza BogaHub
                    </h3>
                    <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px] px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      En vivo
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                    Charla, avisos y datos de Pucallpa
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                title="Cerrar chat"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Canales / Pestañas de Filtro */}
            <div
              className="px-3.5 py-2.5 bg-gray-50/90 dark:bg-[#222126] border-b border-gray-100 dark:border-white/10 flex items-center gap-1.5 overflow-x-auto hide-scrollbar shrink-0"
              style={{ scrollbarWidth: 'none' }}
            >
              {CHANNELS.map((ch) => {
                const active = activeChannel === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      active
                        ? 'bg-primary text-white shadow-[0_2px_8px_rgba(184,19,14,0.35)] scale-[1.02]'
                        : 'bg-white dark:bg-neutral-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 border border-gray-200/70 dark:border-white/5'
                    }`}
                  >
                    <span>{ch.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Lista de Mensajes */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gradient-to-b from-gray-50/40 to-white dark:from-[#17161a] dark:to-[#1a191d]">
              {cargando && messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-xs gap-2">
                  <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                  Cargando mensajes de la plaza...
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-gray-400 mb-2">
                    <span className="material-symbols-outlined text-2xl">chat</span>
                  </div>
                  <p className="font-bold text-xs text-gray-700 dark:text-gray-300">
                    Aún no hay comentarios en este canal
                  </p>
                  <p className="text-[11px] mt-0.5 text-gray-400">
                    ¡Sé el primero en iniciar la conversación!
                  </p>
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isOwn =
                    (authorName && msg.author.toLowerCase() === authorName.toLowerCase()) ||
                    (user?.id && msg.user_id === user.id);
                  const isLiked = likedIds.includes(msg.id);

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2.5 transition-all animate-in fade-in duration-200 ${
                        isOwn ? 'flex-row-reverse' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-full text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs ${
                          msg.avatar_color || 'bg-emerald-600'
                        }`}
                      >
                        {msg.author.charAt(0).toUpperCase()}
                      </div>

                      {/* Tarjeta de Mensaje */}
                      <div
                        className={`max-w-[82%] rounded-2xl p-3 shadow-xs border transition-all ${
                          isOwn
                            ? 'bg-red-50/70 dark:bg-primary/15 border-primary/25 rounded-tr-xs text-gray-900 dark:text-white'
                            : 'bg-white dark:bg-[#232227] border-gray-200/70 dark:border-white/10 rounded-tl-xs text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {/* Cabecera del mensaje */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs">
                              {msg.author}
                            </span>
                            {isOwn ? (
                              <span className="bg-primary/10 text-primary font-bold text-[9px] px-1.5 py-0.2 rounded-full">
                                Tú
                              </span>
                            ) : msg.role ? (
                              <span className="bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 font-medium text-[9px] px-1.5 py-0.2 rounded-full">
                                {msg.role}
                              </span>
                            ) : null}
                          </div>

                          <span className="text-[10px] text-gray-400 font-normal shrink-0">
                            {formatRelativeTime(msg.created_at)}
                          </span>
                        </div>

                        {/* Texto */}
                        <p className="text-xs leading-relaxed whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
                          {msg.text}
                        </p>

                        {/* Footer del mensaje: canal y like */}
                        <div className="mt-2 flex items-center justify-between pt-1 border-t border-gray-100/80 dark:border-white/5">
                          <span className="text-[10px] font-medium text-gray-400">
                            #{msg.channel}
                          </span>

                          <button
                            onClick={() => handleToggleLike(msg)}
                            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-all active:scale-90 ${
                              isLiked
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                                : 'text-gray-400 hover:text-rose-500 hover:bg-gray-100 dark:hover:bg-neutral-800'
                            }`}
                          >
                            <span className="text-xs">{isLiked ? '❤️' : '🤍'}</span>
                            <span>{msg.likes > 0 ? msg.likes : ''}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chips de Respuestas Rápidas */}
            <div
              className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto hide-scrollbar shrink-0 bg-white dark:bg-[#1a191d] border-t border-gray-100 dark:border-white/10"
              style={{ scrollbarWidth: 'none' }}
            >
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="text-[11px] font-medium bg-gray-50 dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full whitespace-nowrap transition-all border border-gray-200/60 dark:border-white/5 active:scale-95 shadow-2xs"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input y Publicación */}
            <div className="p-3 bg-white dark:bg-[#1a191d] border-t border-gray-100 dark:border-white/10 shrink-0">
              {/* Barra de Identidad del Usuario (Limpia y Moderna) */}
              <div className="flex items-center justify-between px-1 mb-2">
                {isEditingName || !authorName ? (
                  <div className="w-full flex items-center gap-1.5 bg-gray-50 dark:bg-neutral-800/90 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-neutral-700 animate-in fade-in">
                    <span className="material-symbols-outlined text-[16px] text-gray-400">person</span>
                    <input
                      type="text"
                      placeholder="Tu nombre (ej. Juan Pérez)..."
                      value={authorName}
                      autoFocus={isEditingName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (authorName.trim()) {
                            const formatted = formatShortName(authorName);
                            setAuthorName(formatted);
                            localStorage.setItem('boga_user_nickname', formatted);
                            setIsEditingName(false);
                            inputRef.current?.focus();
                          }
                        }
                      }}
                      className="flex-1 bg-transparent text-xs text-gray-900 dark:text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (authorName.trim()) {
                          const formatted = formatShortName(authorName);
                          setAuthorName(formatted);
                          localStorage.setItem('boga_user_nickname', formatted);
                          setIsEditingName(false);
                          inputRef.current?.focus();
                        }
                      }}
                      disabled={!authorName.trim()}
                      className="px-2 py-0.5 bg-primary text-white text-[11px] font-bold rounded-lg disabled:opacity-40"
                    >
                      Listo
                    </button>
                  </div>
                ) : (
                  <div className="w-full flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">Publicando como:</span>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="font-bold text-gray-800 dark:text-gray-200 hover:text-primary flex items-center gap-1 bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md transition-colors"
                        title="Cambiar apodo o nombre"
                      >
                        <span>{authorName}</span>
                        <span className="material-symbols-outlined text-[12px] opacity-70">edit</span>
                      </button>
                    </div>

                    <div className="text-[10px] text-gray-400 font-medium">
                      en <span className="font-bold text-primary">#{activeChannel === 'todos' ? 'general' : activeChannel}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Formulario de envío */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <div className="flex-1 relative flex items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={
                      !authorName
                        ? 'Primero ingresa tu nombre arriba...'
                        : `Escribe en #${activeChannel === 'todos' ? 'general' : activeChannel}...`
                    }
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="w-full bg-gray-100/80 dark:bg-neutral-800/90 pl-3.5 pr-3 py-2.5 rounded-2xl text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 border border-gray-200/60 dark:border-neutral-700/60 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!inputText.trim() || enviando}
                  className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-[#d82a20] text-white flex items-center justify-center shrink-0 disabled:opacity-35 disabled:cursor-not-allowed active:scale-95 transition-all shadow-[0_4px_12px_rgba(184,19,14,0.3)] hover:shadow-[0_6px_16px_rgba(184,19,14,0.45)]"
                  title="Enviar comentario"
                >
                  <span className="material-symbols-outlined text-[19px]">
                    send
                  </span>
                </button>
              </form>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
