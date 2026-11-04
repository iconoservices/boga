-- ==============================================================================
-- Tabla: whatsapp_clicks
-- Registra cada clic derivado hacia el WhatsApp de una tienda o negocio.
-- Permite saber cuántos clientes reales envía BogaHub a cada comercio para
-- reportes mensuales, cobro de membresías y analítica de negocios en Pucallpa.
-- ==============================================================================

create table if not exists public.whatsapp_clicks (
  id bigint generated always as identity primary key,
  tienda_slug text not null,
  tipo text default 'contacto',       -- 'pedido', 'contacto', 'link_directo', 'guia', 'trabajo', 'inmueble'
  origen text default '',             -- URL de origen (ej: '/polleria-pardos', '/revista/guia-2025')
  metadata jsonb default '{}'::jsonb, -- datos adicionales (nombre tienda, productos, etc.)
  user_agent text,                    -- navegador / celular
  created_at timestamptz default now()
);

-- Índices para consultas instantáneas en el Superadmin
create index if not exists idx_whatsapp_clicks_tienda on public.whatsapp_clicks (tienda_slug);
create index if not exists idx_whatsapp_clicks_created_at on public.whatsapp_clicks (created_at desc);
create index if not exists idx_whatsapp_clicks_tipo on public.whatsapp_clicks (tipo);

-- Habilitar seguridad por fila (RLS)
alter table public.whatsapp_clicks enable row level security;

-- Cualquier visitante puede registrar su clic (incluso clientes no registrados)
drop policy if exists "Cualquiera puede registrar un click" on public.whatsapp_clicks;
create policy "Cualquiera puede registrar un click"
  on public.whatsapp_clicks
  for insert
  with check (true);

-- Lectura para mostrar métricas en el panel
drop policy if exists "Lectura de clicks para superadmin y anon" on public.whatsapp_clicks;
create policy "Lectura de clicks para superadmin y anon"
  on public.whatsapp_clicks
  for select
  using (true);

