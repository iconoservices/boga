"use client";

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface ChatMessage {
  id: string;
  author: string;
  role?: string;
  avatarColor: string;
  channel: string;
  text: string;
  time: string;
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
    time: 'Hace 12 min',
    likes: 4,
  },
  {
    id: 'msg-2',
    author: 'Doña Rosa',
    role: 'Comerciante',
    avatarColor: 'bg-amber-600',
    channel: 'avisos',
    text: 'Recuerden que hoy tenemos tacacho con cecina fresco en Jr. Sucre. ¡Bienvenidos!',
    time: 'Hace 25 min',
    likes: 7,
  },
  {
    id: 'msg-3',
    author: 'Gerson V.',
    role: 'Conductor',
    avatarColor: 'bg-blue-600',
    channel: 'preguntas',
    text: 'Paso libre por la Federico Basadre km 60, todo despejado y sin lluvia por ahora.',
    time: 'Hace 40 min',
    likes: 9,
  },
  {
    id: 'msg-4',
    author: 'Camila S.',
    role: 'Exploradora',
    avatarColor: 'bg-purple-600',
    channel: 'general',
    text: 'Qué lindo atardecer en Yarinacocha hoy día 🌅 Selva hermosa.',
    time: 'Hace 1 hora',
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

export default function PlazaChatBubble() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState('todos');
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [hasNewBadge, setHasNewBadge] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cargar mensajes y nombre guardados en localStorage
  useEffect(() => {
    try {
      const savedName = localStorage.getItem('boga_user_nickname');
      if (savedName) setAuthorName(savedName);

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

  const filteredMessages =
    activeChannel === 'todos'
      ? messages
      : messages.filter((m) => m.channel === activeChannel);

  const handleSendMessage = (textToSend?: string) => {
    const body = (textToSend || inputText).trim();
    if (!body) return;

    const nickname = authorName.trim() || 'Pucallpino Anónimo';
    if (authorName.trim()) {
      try {
        localStorage.setItem('boga_user_nickname', authorName.trim());
      } catch {}
    }

    const newMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      author: nickname,
      role: 'Tú',
      avatarColor: 'bg-primary',
      channel: activeChannel === 'todos' ? 'general' : activeChannel,
      text: body,
      time: 'Ahora mismo',
      likes: 0,
    };

    setMessages((prev) => {
      const updated = [...prev, newMsg];
      try {
        const customOnly = updated.filter((m) => m.id.startsWith('usr-'));
        localStorage.setItem('boga_plaza_messages', JSON.stringify(customOnly));
      } catch {}
      return updated;
    });

    setInputText('');
  };

  const handleLike = (id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, likes: m.likes + 1 } : m))
    );
  };

  return (
    <>
      {/* Botón / Burbuja flotante */}
      <aside aria-label="Plaza Boga" className="contents">
        <div
          className={`fixed z-40 transition-all duration-300 ${
            isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
          } bottom-20 right-4 sm:bottom-6 sm:right-6`}
        >
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Abrir Plaza Boga Chat"
          className="group relative flex items-center gap-2.5 bg-gradient-to-r from-primary to-[#d82a20] text-white px-4 py-3 sm:px-4 sm:py-3.5 rounded-full shadow-[0_8px_25px_rgba(184,19,14,0.4)] hover:shadow-[0_12px_30px_rgba(184,19,14,0.55)] active:scale-95 transition-all duration-200 border border-white/20"
        >
          {/* Pulso animado */}
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>

          <span className="material-symbols-outlined text-[22px] text-white">
            forum
          </span>

          <span className="font-bold text-sm tracking-tight pr-0.5">
            Plaza Boga
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-end justify-end pointer-events-none sm:p-6">
          {/* Backdrop oscurecido para móvil */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs pointer-events-auto sm:hidden transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <section
            aria-label="Plaza Boga comunidad"
            className="pointer-events-auto w-full sm:w-[410px] h-[85vh] sm:h-[600px] max-h-[92vh] bg-surface-container-lowest dark:bg-inverse-surface border border-surface-container-high dark:border-white/10 rounded-t-[28px] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200"
          >
            {/* Header del Chat */}
            <div className="bg-surface-container-low dark:bg-black/20 border-b border-surface-container-high px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">
                    forum
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-on-surface">
                      Plaza Boga
                    </h3>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <p className="text-[11px] text-secondary">
                    Charla & Comunidad Pucallpa
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-secondary hover:text-on-surface hover:bg-surface-container-high rounded-full transition-colors"
                  title="Cerrar chat"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    close
                  </span>
                </button>
              </div>
            </div>

            {/* Canales / Pestañas de filtros */}
            <div className="px-3 py-2 bg-surface border-b border-surface-container-high/60 flex items-center gap-1.5 overflow-x-auto hide-scrollbar shrink-0">
              {CHANNELS.map((ch) => {
                const active = activeChannel === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                      active
                        ? 'bg-primary text-white shadow-xs font-semibold'
                        : 'bg-surface-container hover:bg-surface-container-high text-secondary'
                    }`}
                  >
                    <span>{ch.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Lista de Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-sm">
              {filteredMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-secondary">
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
                      className={`w-7 h-7 rounded-full text-white font-bold text-[11px] flex items-center justify-center shrink-0 ${msg.avatarColor}`}
                    >
                      {msg.author.charAt(0).toUpperCase()}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 bg-surface-container-low dark:bg-white/5 rounded-2xl p-2.5 rounded-tl-xs border border-surface-container-high/60">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-on-surface">
                            {msg.author}
                          </span>
                          {msg.role && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-sm bg-surface-container-high font-medium text-secondary">
                              {msg.role}
                            </span>
                          )}
                          <span className="text-[10px] text-secondary font-light">
                            • #{msg.channel}
                          </span>
                        </div>
                        <span className="text-[10px] text-secondary">
                          {msg.time}
                        </span>
                      </div>

                      <p className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </p>

                      {/* Reacción */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          onClick={() => handleLike(msg.id)}
                          className="text-[11px] text-secondary hover:text-primary flex items-center gap-1 transition-colors active:scale-95"
                        >
                          <span>❤️</span>
                          <span>{msg.likes > 0 ? msg.likes : ''}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Prompts Rápidos */}
            <div className="px-3 pt-2 pb-1 flex items-center gap-1.5 overflow-x-auto hide-scrollbar shrink-0 bg-surface border-t border-surface-container-high/50">
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="text-[11px] bg-surface-container-low hover:bg-surface-container text-secondary hover:text-on-surface px-2.5 py-1 rounded-full whitespace-nowrap transition-colors border border-surface-container-high"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Footer */}
            <div className="p-3 bg-surface-container-lowest dark:bg-inverse-surface border-t border-surface-container-high shrink-0">
              {/* Alias / Nombre de usuario */}
              <div className="flex items-center justify-between mb-2 text-[11px] text-secondary px-1">
                <span>Tu nombre / alias:</span>
                <input
                  type="text"
                  placeholder="Ej. Juan P. o Anónimo"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="bg-transparent border-b border-surface-container-high focus:border-primary outline-none px-1 text-on-surface text-right font-medium max-w-[150px]"
                />
              </div>

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
                  className="flex-1 bg-surface-container px-3.5 py-2.5 rounded-xl text-xs text-on-surface placeholder:text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
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
