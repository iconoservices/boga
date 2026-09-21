"use client";

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { RUTAS_DE_BOGAHUB } from '@/lib/rutasBoga';

interface ChatMessage {
  id: string;
  author: string;
  role?: string;
  avatarColor: string;
  channel: string;
  text: string;
  likes: number;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    author: 'Renzo M.',
    role: 'Vecino',
    avatarColor: 'bg-emerald-600',
    channel: 'general',
    text: '¡Buenas tardes gentita de Pucallpa! ¿Alguien sabe si el malecón Grau ya tiene actividad hoy?',
    likes: 4,
  },
  {
    id: 'msg-3',
    author: 'Gerson V.',
    role: 'Conductor',
    avatarColor: 'bg-blue-600',
    channel: 'preguntas',
    text: 'Paso libre por la Federico Basadre km 60, todo despejado y sin lluvia por ahora.',
    likes: 9,
  },
  {
    id: 'msg-4',
    author: 'Camila S.',
    role: 'Exploradora',
    avatarColor: 'bg-purple-600',
    channel: 'general',
    text: 'Qué lindo atardecer en Yarinacocha hoy día 🌅 Selva hermosa.',
    likes: 12,
  },
];

const CHANNELS = [
  { id: 'todos', label: '🔥 Todo', icon: 'forum' },
  { id: 'general', label: '# General', icon: 'chat' },
  { id: 'avisos', label: '# Avisos', icon: 'campaign' },
  { id: 'preguntas', label: '# Preguntas', icon: 'help_outline' },
];

const QUICK_PROMPTS = [
  '👋 ¡Hola gente!',
  '❓ ¿Qué hay de bueno hoy?',
  '🍲 Recomienden comida',
  '🛵 ¿Cómo está el tráfico?',
];

// "juan pérez ramos" -> "Juan R." (primer nombre + inicial del último apellido)
function shortName(raw: string) {
  const words = raw.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  if (words.length === 1) return cap(words[0]);
  return `${cap(words[0])} ${words[words.length - 1].charAt(0).toUpperCase()}.`;
}

export default function PlazaChatBubble() {
  const pathname = usePathname();
  // true si se abrió desde <tienda>.bogahub.app (se lee en el cliente, tras montar)
  // (null = todavía no se sabe: no se dibuja nada para que no parpadee)
  const [enDireccionDeTienda, setEnDireccionDeTienda] = useState<boolean | null>(null);
  useEffect(() => {
    const partes = window.location.hostname.split('.');
    setEnDireccionDeTienda(partes.length > 2 && partes[0] !== 'www' && window.location.hostname.endsWith('.bogahub.app'));
  }, []);
  const [isOpen, setIsOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState('todos');
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [hasNewBadge, setHasNewBadge] = useState(true);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cargar mensajes y nombre guardados en localStorage
  useEffect(() => {
    try {
      const savedName = localStorage.getItem('boga_user_nickname');
      if (savedName) setAuthorName(savedName);

      const savedLikes = localStorage.getItem('boga_plaza_likes');
      if (savedLikes) {
        const parsedLikes = JSON.parse(savedLikes);
        if (Array.isArray(parsedLikes)) setLikedIds(parsedLikes);
      }

      const savedMsgs = localStorage.getItem('boga_plaza_messages');
      if (savedMsgs) {
        const parsed = JSON.parse(savedMsgs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages([...INITIAL_MESSAGES, ...parsed]);
        }
      }
    } catch {
      // ignore storage error
    }
  }, []);

  // Auto scroll al final de mensajes cuando se abre o envía
  useEffect(() => {
    if (isOpen) {
      setHasNewBadge(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
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

  // No mostrar en rutas administrativas
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/superadmin') ||
    pathname.startsWith('/negocios')
  ) {
    return null;
  }

  // Tampoco dentro de una tienda: ni en bogahub.app/<tienda> ni en su dirección propia
  // (<tienda>.bogahub.app, donde la portada "/" es la tienda). El chat es de la plaza de BogaHub.
  const primero = pathname.split('/')[1] || '';
  const enTienda = primero !== '' && !RUTAS_DE_BOGAHUB.has(primero);
  if (enTienda || enDireccionDeTienda !== false) return null;

  const filteredMessages =
    activeChannel === 'todos'
      ? messages
      : messages.filter((m) => m.channel === activeChannel);

  const handleSendMessage = (textToSend?: string) => {
    const body = (textToSend || inputText).trim();
    if (!body) return;

    const nickname = shortName(authorName);
    if (!nickname) return; // sin nombre no se publica
    try {
      localStorage.setItem('boga_user_nickname', authorName.trim());
    } catch {}

    const newMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      author: nickname,
      role: 'Tú',
      avatarColor: 'bg-primary',
      channel: activeChannel === 'todos' ? 'general' : activeChannel,
      text: body,
      likes: 0,
    };

    setMessages((prev) => persistCustom([...prev, newMsg]));
    setInputText('');
  };

  // Guarda en localStorage solo los mensajes propios (id "usr-...") y
  // devuelve la lista completa, para poder hacer setMessages(persistCustom(...)).
  const persistCustom = (updated: ChatMessage[]) => {
    try {
      const customOnly = updated.filter((m) => m.id.startsWith('usr-'));
      localStorage.setItem('boga_plaza_messages', JSON.stringify(customOnly));
    } catch {}
    return updated;
  };

  // Un solo like por mensaje: tocar de nuevo lo quita.
  const handleLike = (id: string) => {
    const already = likedIds.includes(id);
    const nextLiked = already ? likedIds.filter((x) => x !== id) : [...likedIds, id];
    setLikedIds(nextLiked);
    try {
      localStorage.setItem('boga_plaza_likes', JSON.stringify(nextLiked));
    } catch {}
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, likes: Math.max(0, m.likes + (already ? -1 : 1)) } : m))
    );
  };

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingId(msg.id);
    setEditingText(msg.text);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const handleSaveEdit = () => {
    const body = editingText.trim();
    if (!body || !editingId) { handleCancelEdit(); return; }
    setMessages((prev) =>
      persistCustom(prev.map((m) => (m.id === editingId ? { ...m, text: body } : m)))
    );
    handleCancelEdit();
  };

  const handleDeleteMessage = (id: string) => {
    if (!confirm('¿Borrar este comentario?')) return;
    setMessages((prev) => persistCustom(prev.filter((m) => m.id !== id)));
  };

  return (
    <>
      {/* Botón / Burbuja flotante */}
      <aside aria-label="Plaza BogaHub" className="contents">
        <div
          className={`fixed z-40 transition-all duration-300 ${
            isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
          } bottom-[calc(80px+env(safe-area-inset-bottom)+12px)] right-4 sm:bottom-6 sm:right-6`}
        >
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Abrir Plaza Boga Chat"
          className="group relative flex items-center justify-center w-14 h-14 bg-gradient-to-r from-primary to-[#d82a20] text-white rounded-full shadow-[0_8px_25px_rgba(184,19,14,0.4)] hover:shadow-[0_12px_30px_rgba(184,19,14,0.55)] active:scale-95 transition-all duration-200 border border-white/20"
        >
          <span className="material-symbols-outlined text-[26px] text-white">
            forum
          </span>

          {hasNewBadge && (
            <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-amber-950 font-black text-[10px] px-1.5 py-0.5 rounded-full shadow-sm">
              NUEVO
            </span>
          )}
        </button>
      </div>
      </aside>

      {/* Ventana / Drawer de Chat */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-end sm:justify-end pointer-events-none sm:p-6">
          {/* Backdrop oscurecido para móvil y escritorio */}
          <div
            className="fixed inset-0 bg-black/60 pointer-events-auto transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <section
            aria-label="Plaza BogaHub comunidad"
            className="relative z-10 pointer-events-auto w-full sm:w-[410px] h-[85vh] sm:h-[600px] max-h-[92vh] bg-white dark:bg-[#1c1b1f] border border-gray-200 dark:border-white/10 rounded-t-[28px] sm:rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200"
          >
            {/* Tirador móvil (handle bar) */}
            <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-white dark:bg-[#1c1b1f]">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-neutral-700" />
            </div>

            {/* Header del Chat */}
            <div className="bg-white dark:bg-[#1c1b1f] border-b border-gray-200 dark:border-white/10 px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">
                    forum
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                      Plaza BogaHub
                    </h3>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Charla & Comunidad Pucallpa
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                  title="Cerrar chat"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    close
                  </span>
                </button>
              </div>
            </div>

            {/* Canales / Pestañas de filtros */}
            <div className="px-3 py-2 bg-gray-50 dark:bg-[#252429] border-b border-gray-200 dark:border-white/10 flex items-center gap-1.5 overflow-x-auto hide-scrollbar shrink-0" style={{ scrollbarWidth: 'none' }}>
              {CHANNELS.map((ch) => {
                const active = activeChannel === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch.id)}
                    className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-all flex items-center gap-1 ${
                      active
                        ? 'bg-primary text-white shadow-xs font-semibold'
                        : 'bg-white dark:bg-neutral-800 hover:bg-gray-200 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-neutral-700'
                    }`}
                  >
                    <span>{ch.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Lista de Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-sm bg-white dark:bg-[#1c1b1f]">
              {filteredMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-40">
                    chat_bubble_outline
                  </span>
                  <p className="font-medium text-xs">
                    No hay comentarios en este canal aún.
                  </p>
                  <p className="text-[11px] mt-1 opacity-70">
                    ¡Sé el primero en iniciar la conversación!
                  </p>
                </div>
              ) : (
                filteredMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-start gap-2.5 group animate-in fade-in duration-150"
                  >
                    {/* Avatar */}
                    <div
                      className={`w-7 h-7 rounded-full text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-xs ${msg.avatarColor}`}
                    >
                      {msg.author.charAt(0).toUpperCase()}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 bg-gray-50 dark:bg-neutral-800/80 rounded-2xl p-2.5 rounded-tl-xs border border-gray-200 dark:border-neutral-700">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-gray-900 dark:text-white">
                            {msg.author}
                          </span>
                          <span className="text-[10px] text-gray-500 font-light">
                            • #{msg.channel}
                          </span>
                        </div>
                      </div>

                      {editingId === msg.id ? (
                        <div className="flex flex-col gap-1.5 mt-1">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            rows={2}
                            autoFocus
                            className="w-full bg-white dark:bg-neutral-900 border border-primary rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white outline-none resize-none"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleSaveEdit}
                              className="text-[11px] font-bold text-primary hover:underline"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-[11px] text-gray-500 hover:underline"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                          {msg.text}
                        </p>
                      )}

                      {/* Reacción + Editar/Borrar (solo en mensajes propios) */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          onClick={() => handleLike(msg.id)}
                          className="text-[11px] text-gray-500 hover:text-primary flex items-center gap-1 transition-colors active:scale-95"
                        >
                          <span>{likedIds.includes(msg.id) ? '❤️' : '🤍'}</span>
                          <span>{msg.likes > 0 ? msg.likes : ''}</span>
                        </button>
                        {msg.id.startsWith('usr-') && editingId !== msg.id && (
                          <>
                            <button
                              onClick={() => handleStartEdit(msg)}
                              className="text-[11px] text-gray-500 hover:text-primary flex items-center gap-1 transition-colors active:scale-95"
                            >
                              <span className="material-symbols-outlined text-[13px]">edit</span>
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="text-[11px] text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors active:scale-95"
                            >
                              <span className="material-symbols-outlined text-[13px]">delete</span>
                              Borrar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Prompts Rápidos */}
            <div className="px-3 pt-2 pb-1.5 flex items-center gap-1.5 overflow-x-auto hide-scrollbar shrink-0 bg-gray-50 dark:bg-[#252429] border-t border-gray-200 dark:border-white/10" style={{ scrollbarWidth: 'none' }}>
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={!authorName.trim()}
                  className="text-[11px] disabled:opacity-40 bg-white dark:bg-neutral-800 hover:bg-gray-100 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors border border-gray-200 dark:border-neutral-700"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Footer */}
            <div className="p-3 bg-white dark:bg-[#1c1b1f] border-t border-gray-200 dark:border-white/10 shrink-0">
              {/* Canal donde se publica */}
              <p className="text-[10px] text-gray-500 px-1 mb-1.5">
                Vas a publicar en <span className="font-bold text-primary">#{activeChannel === 'todos' ? 'general' : activeChannel}</span> — tocá otro canal arriba para cambiarlo.
              </p>
              {/* Alias / Nombre de usuario */}
              <div className="flex items-center justify-between mb-2 text-[11px] text-gray-500 px-1">
                <span>Tu nombre <span className="text-primary">*</span></span>
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={authorName}
                  onChange={(e) => {
                    setAuthorName(e.target.value);
                    try {
                      localStorage.setItem('boga_user_nickname', e.target.value);
                    } catch {}
                  }}
                  className="bg-transparent border-b border-gray-300 dark:border-neutral-700 focus:border-primary outline-none px-1 text-gray-900 dark:text-white text-right font-medium max-w-[150px]"
                />
              </div>

              {!authorName.trim() && (
                <p className="text-[10px] text-primary px-1 mb-1.5">
                  Escribe tu nombre para poder comentar. Se mostrará como &quot;{'Juan P.'}&quot;.
                </p>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Escribe un comentario o consulta..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 bg-gray-100 dark:bg-neutral-800 px-3.5 py-2.5 rounded-xl text-xs text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-primary border border-gray-200 dark:border-neutral-700"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || !authorName.trim()}
                  className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 disabled:opacity-40 active:scale-95 transition-all shadow-sm"
                  title="Enviar"
                >
                  <span className="material-symbols-outlined text-[18px]">
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
