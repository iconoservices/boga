-- ==============================================================================
-- Tabla: plaza_messages
-- Chat Comunitario "Plaza BogaHub" en tiempo real para Pucallpa.
-- Permite a vecinos, comerciantes y visitantes compartir avisos, preguntas
-- y recomendaciones en vivo.
-- ==============================================================================

create table if not exists public.plaza_messages (
  id bigint generated always as identity primary key,
  author text not null,               -- Nombre público abreviado (ej: "Juan P.")
  user_id text,                       -- ID del usuario en Supabase si está logueado (opcional)
  role text default 'Vecino',         -- 'Vecino', 'Comerciante', 'Explorador', etc.
  avatar_color text default 'bg-emerald-600',
  channel text default 'general',     -- 'general', 'avisos', 'preguntas'
  text text not null,                 -- Contenido del mensaje
  likes integer default 0,            -- Contador de me gusta
  created_at timestamptz default now()
);

-- Índices para carga instantánea
create index if not exists idx_plaza_messages_created on public.plaza_messages (created_at desc);
create index if not exists idx_plaza_messages_channel on public.plaza_messages (channel);

-- Habilitar seguridad RLS
alter table public.plaza_messages enable row level security;

-- Políticas de acceso
drop policy if exists "Lectura pública de mensajes de la plaza" on public.plaza_messages;
create policy "Lectura pública de mensajes de la plaza"
  on public.plaza_messages
  for select
  using (true);

drop policy if exists "Cualquiera puede publicar en la plaza" on public.plaza_messages;
create policy "Cualquiera puede publicar en la plaza"
  on public.plaza_messages
  for insert
  with check (true);

drop policy if exists "Actualizar likes o mensajes" on public.plaza_messages;
create policy "Actualizar likes o mensajes"
  on public.plaza_messages
  for update
  using (true)
  with check (true);

drop policy if exists "Eliminar mensaje propio o admin" on public.plaza_messages;
create policy "Eliminar mensaje propio o admin"
  on public.plaza_messages
  for delete
  using (true);

-- Semilla de mensajes iniciales para que la plaza se sienta viva desde el primer segundo
insert into public.plaza_messages (author, role, avatar_color, channel, text, likes, created_at)
values
  ('Renzo M.', 'Vecino', 'bg-emerald-600', 'general', '¡Buenas tardes gentita de Pucallpa! ¿Alguien sabe si el malecón Grau ya tiene actividad hoy?', 4, now() - interval '2 hours'),
  ('Gerson V.', 'Conductor', 'bg-blue-600', 'preguntas', 'Paso libre por la Federico Basadre km 60, todo despejado y sin lluvia por ahora.', 9, now() - interval '1 hour'),
  ('Camila S.', 'Exploradora', 'bg-purple-600', 'general', 'Qué lindo atardecer en Yarinacocha hoy día 🌅 Selva hermosa.', 12, now() - interval '30 minutes')
on conflict do nothing;
