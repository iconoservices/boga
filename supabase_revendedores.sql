-- ==============================================================================
-- Migración: Red de Revendedores & Catálogo Compartido (Dropshipping B2B)
-- BogaHub Pucallpa
-- ==============================================================================

-- 1. Nuevas columnas en la tabla `stores`
-- Permite a un negocio ofrecer sus productos a revendedores, o identificarse como tienda revendedora.
alter table public.stores add column if not exists permite_revendedores boolean default false;
alter table public.stores add column if not exists notas_revendedores text default '';
alter table public.stores add column if not exists es_revendedor boolean default false;
alter table public.stores add column if not exists tienda_proveedora text default null;
alter table public.stores add column if not exists modo_pedidos_reventa text default 'revendedor'; -- 'revendedor' o 'proveedor_referido'

-- 2. Nuevas columnas en la tabla `products`
-- Trazabilidad de productos clonados de tiendas aliadas
alter table public.products add column if not exists proveedor_store text default null;
alter table public.products add column if not exists proveedor_product_id text default null;
alter table public.products add column if not exists en_market boolean default true;

-- 3. Índices para búsqueda rápida de proveedores y productos compartidos
create index if not exists idx_stores_permite_revendedores on public.stores (permite_revendedores) where permite_revendedores = true;
create index if not exists idx_products_proveedor_store on public.products (proveedor_store);
create index if not exists idx_stores_tienda_proveedora on public.stores (tienda_proveedora);

