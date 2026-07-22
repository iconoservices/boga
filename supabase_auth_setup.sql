-- ============================================================
-- Autenticacion real + base completa + RLS seguro
-- ============================================================
-- Diagnostico (verificado contra el proyecto real): la app usa 4 tablas
-- (stores, products, orders, store_requests) pero solo estaban creadas
-- stores y products. Este script crea las 2 que faltaban y deja las politicas
-- de seguridad (RLS) parejas en las 4:
--   - Cada tienda tiene dueño (stores.user_id). Solo el dueño (o el superadmin)
--     puede editar su tienda, sus productos y sus pedidos.
--   - El superadmin se identifica por su correo. TIENE que ser el mismo que
--     está en SUPERADMIN_EMAILS, en src/app/superadmin/page.tsx.
--
-- Es 100% repetible: cada CREATE POLICY tiene su DROP IF EXISTS antes, asi
-- que se puede correr las veces que haga falta sin chocar. No toca datos.

-- ============================================================
-- 1. TABLAS QUE FALTABAN
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store VARCHAR NOT NULL,
  customer_name VARCHAR NOT NULL,
  customer_phone VARCHAR,
  customer_address VARCHAR,
  items JSONB NOT NULL,
  total_amount NUMERIC NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'Pendiente',
  payment_method VARCHAR,
  seller_name VARCHAR,
  order_source VARCHAR DEFAULT 'App',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.store_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  business_name TEXT NOT NULL,
  category TEXT,
  contact_name TEXT,
  whatsapp TEXT NOT NULL,
  email TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending'
);
ALTER TABLE public.store_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS store_requests_status_idx ON public.store_requests (status);

-- ============================================================
-- 2. STORES
-- ============================================================
DROP POLICY IF EXISTS "Permitir insertar tiendas a todos" ON public.stores;
DROP POLICY IF EXISTS "Permitir actualizar tiendas a todos" ON public.stores;
DROP POLICY IF EXISTS "Permitir eliminar tiendas a todos" ON public.stores;

DROP POLICY IF EXISTS "Solo el superadmin crea tiendas nuevas" ON public.stores;
CREATE POLICY "Solo el superadmin crea tiendas nuevas"
ON public.stores FOR INSERT
WITH CHECK (auth.jwt() ->> 'email' = 'jnmcsky@gmail.com');

DROP POLICY IF EXISTS "Dueño o superadmin edita la tienda" ON public.stores;
CREATE POLICY "Dueño o superadmin edita la tienda"
ON public.stores FOR UPDATE
USING (
  auth.uid() = user_id
  OR user_id IS NULL
  OR auth.jwt() ->> 'email' = 'jnmcsky@gmail.com'
)
WITH CHECK (
  auth.uid() = user_id
  OR auth.jwt() ->> 'email' = 'jnmcsky@gmail.com'
);

DROP POLICY IF EXISTS "Dueño o superadmin borra la tienda" ON public.stores;
CREATE POLICY "Dueño o superadmin borra la tienda"
ON public.stores FOR DELETE
USING (
  auth.uid() = user_id
  OR auth.jwt() ->> 'email' = 'jnmcsky@gmail.com'
);

-- ============================================================
-- 3. PRODUCTS
-- ============================================================
DROP POLICY IF EXISTS "Enable insert for all users" ON public.products;
DROP POLICY IF EXISTS "Enable update for all users" ON public.products;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.products;
DROP POLICY IF EXISTS "Permitir insertar productos a todos" ON public.products;
DROP POLICY IF EXISTS "Permitir actualizar productos a todos" ON public.products;
DROP POLICY IF EXISTS "Permitir eliminar productos a todos" ON public.products;

DROP POLICY IF EXISTS "Dueño o superadmin crea productos de su tienda" ON public.products;
CREATE POLICY "Dueño o superadmin crea productos de su tienda"
ON public.products FOR INSERT
WITH CHECK (
  auth.jwt() ->> 'email' = 'jnmcsky@gmail.com'
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.slug = products.store AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Dueño o superadmin edita productos de su tienda" ON public.products;
CREATE POLICY "Dueño o superadmin edita productos de su tienda"
ON public.products FOR UPDATE
USING (
  auth.jwt() ->> 'email' = 'jnmcsky@gmail.com'
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.slug = products.store AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Dueño o superadmin borra productos de su tienda" ON public.products;
CREATE POLICY "Dueño o superadmin borra productos de su tienda"
ON public.products FOR DELETE
USING (
  auth.jwt() ->> 'email' = 'jnmcsky@gmail.com'
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.slug = products.store AND s.user_id = auth.uid())
);

-- ============================================================
-- 4. ORDERS
-- ============================================================
DROP POLICY IF EXISTS "Dueño o superadmin ve pedidos de su tienda" ON public.orders;
CREATE POLICY "Dueño o superadmin ve pedidos de su tienda"
ON public.orders FOR SELECT
USING (
  auth.jwt() ->> 'email' = 'jnmcsky@gmail.com'
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.slug = orders.store AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Dueño o superadmin crea pedidos de su tienda" ON public.orders;
CREATE POLICY "Dueño o superadmin crea pedidos de su tienda"
ON public.orders FOR INSERT
WITH CHECK (
  auth.jwt() ->> 'email' = 'jnmcsky@gmail.com'
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.slug = orders.store AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Dueño o superadmin actualiza pedidos de su tienda" ON public.orders;
CREATE POLICY "Dueño o superadmin actualiza pedidos de su tienda"
ON public.orders FOR UPDATE
USING (
  auth.jwt() ->> 'email' = 'jnmcsky@gmail.com'
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.slug = orders.store AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Dueño o superadmin borra pedidos de su tienda" ON public.orders;
CREATE POLICY "Dueño o superadmin borra pedidos de su tienda"
ON public.orders FOR DELETE
USING (
  auth.jwt() ->> 'email' = 'jnmcsky@gmail.com'
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.slug = orders.store AND s.user_id = auth.uid())
);

-- ============================================================
-- 5. STORE_REQUESTS
-- ============================================================
DROP POLICY IF EXISTS "Cualquiera puede postularse" ON public.store_requests;
CREATE POLICY "Cualquiera puede postularse"
ON public.store_requests FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Solo el superadmin lee las solicitudes" ON public.store_requests;
CREATE POLICY "Solo el superadmin lee las solicitudes"
ON public.store_requests FOR SELECT
USING (auth.jwt() ->> 'email' = 'jnmcsky@gmail.com');

DROP POLICY IF EXISTS "Solo el superadmin aprueba o rechaza solicitudes" ON public.store_requests;
CREATE POLICY "Solo el superadmin aprueba o rechaza solicitudes"
ON public.store_requests FOR UPDATE
USING (auth.jwt() ->> 'email' = 'jnmcsky@gmail.com');
