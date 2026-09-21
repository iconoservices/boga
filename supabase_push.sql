-- Notificaciones push de BogaHub y sus tiendas. Correr UNA vez en el SQL editor de Supabase.
--
-- Una suscripción es de un NAVEGADOR (o de una app instalada) en una dirección concreta. Cada
-- persona elige de qué tiendas quiere recibir avisos (`push_seguidas`); el canal reservado
-- 'boga' son los avisos de la propia plataforma.
--
-- Sin políticas de RLS a propósito: solo el servidor (service role) lee y escribe estas tablas.
-- El navegador nunca las toca directo: una suscripción es un dato sensible.

create table if not exists public.push_subs (
  endpoint    text primary key,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.push_seguidas (
  endpoint    text not null references public.push_subs(endpoint) on delete cascade,
  store_slug  text not null,
  created_at  timestamptz not null default now(),
  primary key (endpoint, store_slug)
);
create index if not exists push_seguidas_tienda_idx on public.push_seguidas (store_slug);

create table if not exists public.push_campanas (
  id          bigserial primary key,
  store_slug  text not null,
  titulo      text not null,
  cuerpo      text not null,
  url         text,
  enviada_por text,
  enviados    int not null default 0,
  fallidos    int not null default 0,
  creada_at   timestamptz not null default now()
);
create index if not exists push_campanas_tienda_idx on public.push_campanas (store_slug, creada_at desc);

alter table public.push_subs      enable row level security;
alter table public.push_seguidas  enable row level security;
alter table public.push_campanas  enable row level security;

-- Interruptor por tienda (lo prende el superadmin): solo las tiendas con push_activo pueden
-- tener suscriptores y enviar campañas. Por defecto apagado.
alter table public.stores add column if not exists push_activo boolean default false;
