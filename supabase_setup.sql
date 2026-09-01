-- ============================================================
-- Boga Market · Setup único de base de datos + seguridad (RLS)
-- ============================================================
-- ESTE es el único script que hay que correr. Reemplaza a:
--   supabase_auth_setup.sql, supabase_stores_setup.sql,
--   supabase_orders_setup.sql, supabase_store_requests_setup.sql,
--   supabase_profiles_setup.sql
--
-- Por qué se unificó: los scripts sueltos se contradecían. Los "viejos"
-- creaban políticas `USING (true)` (todo público) y los "nuevos" no siempre
-- las borraban, así que quedaban las dos y RLS combina con OR: ganaba la
-- permisiva. Resultado: pedidos (nombre, teléfono y dirección de cada
-- cliente) y solicitudes de alta quedaban leíbles por cualquiera con la
-- anon key (que viaja en el bundle del navegador).
--
-- Es 100% idempotente y no toca datos: se puede correr las veces que haga
-- falta. Cada política se DROPea antes de crearse, y se borran TODOS los
-- nombres permisivos históricos conocidos.
--
-- El acceso de superadmin sale de public.is_superadmin() — un solo lugar.
-- Tiene que coincidir con SUPERADMIN_EMAILS en src/app/superadmin/page.tsx.

-- ============================================================
-- 0. HELPER: quién es superadmin (única fuente de verdad en SQL)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(auth.jwt() ->> 'email', '') = 'jnmcsky@gmail.com'
$$;

-- ============================================================
-- 1. TABLAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  marketplace_category TEXT,
  template TEXT DEFAULT 'default',
  hero_image TEXT,
  hero_alt TEXT,
  logo_image TEXT,
  theme JSONB DEFAULT '{}'::jsonb,
  categories JSONB DEFAULT '[]'::jsonb,
  whatsapp TEXT,
  show_demo_products BOOLEAN DEFAULT true,
  zona TEXT,
  direccion TEXT,
  horario TEXT,
  rating NUMERIC(2,1),
  metodos_pago TEXT[],
  status TEXT DEFAULT 'active'
);

-- Migraciones para tablas que ya existían (columnas agregadas después del launch)
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS logo_image TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS show_demo_products BOOLEAN DEFAULT true;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS zona TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS horario TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1);
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS metodos_pago TEXT[];

CREATE INDEX IF NOT EXISTS stores_slug_idx ON public.stores (slug);
CREATE INDEX IF NOT EXISTS stores_user_id_idx ON public.stores (user_id);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  store TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  subcategory TEXT,
  stock INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Activo',
  image TEXT,
  description TEXT
);
CREATE INDEX IF NOT EXISTS products_store_idx ON public.products (store);

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
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_name VARCHAR;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_source VARCHAR DEFAULT 'App';
CREATE INDEX IF NOT EXISTS orders_store_idx ON public.orders (store);

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
CREATE INDEX IF NOT EXISTS store_requests_status_idx ON public.store_requests (status);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.stores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. LIMPIEZA: borrar TODAS las políticas permisivas históricas
-- ============================================================
-- stores
DROP POLICY IF EXISTS "Permitir leer tiendas a todos"       ON public.stores;
DROP POLICY IF EXISTS "Permitir insertar tiendas a todos"    ON public.stores;
DROP POLICY IF EXISTS "Permitir actualizar tiendas a todos"  ON public.stores;
DROP POLICY IF EXISTS "Permitir eliminar tiendas a todos"    ON public.stores;
DROP POLICY IF EXISTS "Solo el superadmin crea tiendas nuevas" ON public.stores;
DROP POLICY IF EXISTS "Dueño o superadmin edita la tienda"   ON public.stores;
DROP POLICY IF EXISTS "Dueño o superadmin borra la tienda"   ON public.stores;
-- products
DROP POLICY IF EXISTS "Enable read access for all users"     ON public.products;
DROP POLICY IF EXISTS "Enable insert for all users"          ON public.products;
DROP POLICY IF EXISTS "Enable update for all users"          ON public.products;
DROP POLICY IF EXISTS "Enable delete for all users"          ON public.products;
DROP POLICY IF EXISTS "Permitir leer productos a todos"      ON public.products;
DROP POLICY IF EXISTS "Permitir insertar productos a todos"  ON public.products;
DROP POLICY IF EXISTS "Permitir actualizar productos a todos" ON public.products;
DROP POLICY IF EXISTS "Permitir eliminar productos a todos"  ON public.products;
DROP POLICY IF EXISTS "Dueño o superadmin crea productos de su tienda"  ON public.products;
DROP POLICY IF EXISTS "Dueño o superadmin edita productos de su tienda" ON public.products;
DROP POLICY IF EXISTS "Dueño o superadmin borra productos de su tienda" ON public.products;
-- orders
DROP POLICY IF EXISTS "Permitir insertar pedidos a todos"    ON public.orders;
DROP POLICY IF EXISTS "Permitir leer pedidos a todos"        ON public.orders;
DROP POLICY IF EXISTS "Permitir actualizar pedidos a todos"  ON public.orders;
DROP POLICY IF EXISTS "Permitir eliminar pedidos a todos"    ON public.orders;
DROP POLICY IF EXISTS "Dueño o superadmin ve pedidos de su tienda"        ON public.orders;
DROP POLICY IF EXISTS "Dueño o superadmin crea pedidos de su tienda"      ON public.orders;
DROP POLICY IF EXISTS "Dueño o superadmin actualiza pedidos de su tienda" ON public.orders;
DROP POLICY IF EXISTS "Dueño o superadmin borra pedidos de su tienda"     ON public.orders;
-- store_requests
DROP POLICY IF EXISTS "Permitir insertar solicitudes a todos"   ON public.store_requests;
DROP POLICY IF EXISTS "Permitir leer solicitudes a todos"       ON public.store_requests;
DROP POLICY IF EXISTS "Permitir actualizar solicitudes a todos" ON public.store_requests;
DROP POLICY IF EXISTS "Cualquiera puede postularse"             ON public.store_requests;
DROP POLICY IF EXISTS "Solo el superadmin lee las solicitudes"  ON public.store_requests;
DROP POLICY IF EXISTS "Solo el superadmin aprueba o rechaza solicitudes" ON public.store_requests;
-- profiles
DROP POLICY IF EXISTS "Cada quien ve su perfil, superadmin ve todos" ON public.profiles;
DROP POLICY IF EXISTS "Cada usuario actualiza su propio perfil"      ON public.profiles;

-- ============================================================
-- 3. STORES
-- ============================================================
-- Lectura pública: la vitrina del marketplace y cada storefront /[slug]
-- necesitan leer la tienda sin login (incluye el whatsapp del botón de pedido).
CREATE POLICY "stores: lectura pública"
ON public.stores FOR SELECT
USING (true);

CREATE POLICY "stores: solo superadmin crea"
ON public.stores FOR INSERT
WITH CHECK (public.is_superadmin());

-- UPDATE: el dueño, el superadmin, o cualquiera logueado sobre una tienda
-- SIN dueño (para el flujo de "reclamar mi tienda" en /admin). El WITH CHECK
-- impide que al reclamar se le ponga un user_id ajeno.
CREATE POLICY "stores: dueño o superadmin edita"
ON public.stores FOR UPDATE
USING (
  auth.uid() = user_id
  OR user_id IS NULL
  OR public.is_superadmin()
)
WITH CHECK (
  auth.uid() = user_id
  OR public.is_superadmin()
);

CREATE POLICY "stores: dueño o superadmin borra"
ON public.stores FOR DELETE
USING (auth.uid() = user_id OR public.is_superadmin());

-- ============================================================
-- 4. PRODUCTS
-- ============================================================
-- Lectura pública: los storefronts muestran el catálogo sin login.
CREATE POLICY "products: lectura pública"
ON public.products FOR SELECT
USING (true);

CREATE POLICY "products: dueño o superadmin crea"
ON public.products FOR INSERT
WITH CHECK (
  public.is_superadmin()
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.slug = products.store AND s.user_id = auth.uid())
);

CREATE POLICY "products: dueño o superadmin edita"
ON public.products FOR UPDATE
USING (
  public.is_superadmin()
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.slug = products.store AND s.user_id = auth.uid())
);

CREATE POLICY "products: dueño o superadmin borra"
ON public.products FOR DELETE
USING (
  public.is_superadmin()
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.slug = products.store AND s.user_id = auth.uid())
);

-- ============================================================
-- 5. ORDERS  (nada es público: el cliente pide por WhatsApp, no escribe acá)
-- ============================================================
CREATE POLICY "orders: dueño o superadmin ve"
ON public.orders FOR SELECT
USING (
  public.is_superadmin()
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.slug = orders.store AND s.user_id = auth.uid())
);

CREATE POLICY "orders: dueño o superadmin crea"
ON public.orders FOR INSERT
WITH CHECK (
  public.is_superadmin()
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.slug = orders.store AND s.user_id = auth.uid())
);

CREATE POLICY "orders: dueño o superadmin actualiza"
ON public.orders FOR UPDATE
USING (
  public.is_superadmin()
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.slug = orders.store AND s.user_id = auth.uid())
);

CREATE POLICY "orders: dueño o superadmin borra"
ON public.orders FOR DELETE
USING (
  public.is_superadmin()
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.slug = orders.store AND s.user_id = auth.uid())
);

-- ============================================================
-- 6. STORE_REQUESTS  (form público de alta; solo superadmin lee/gestiona)
-- ============================================================
CREATE POLICY "store_requests: cualquiera se postula"
ON public.store_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "store_requests: solo superadmin lee"
ON public.store_requests FOR SELECT
USING (public.is_superadmin());

CREATE POLICY "store_requests: solo superadmin gestiona"
ON public.store_requests FOR UPDATE
USING (public.is_superadmin());

-- ============================================================
-- 7. PROFILES  (para la lista de Usuarios del superadmin, sin service_role)
-- ============================================================
CREATE POLICY "profiles: cada quien el suyo, superadmin todos"
ON public.profiles FOR SELECT
USING (auth.uid() = id OR public.is_superadmin());

CREATE POLICY "profiles: cada quien actualiza el suyo"
ON public.profiles FOR UPDATE
USING (auth.uid() = id OR public.is_superadmin());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. STORAGE: buckets de imágenes
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('store-assets', 'store-assets', true),
  ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Permitir lectura publica de assets de tienda" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subir assets de tienda a todos"      ON storage.objects;
DROP POLICY IF EXISTS "Permitir editar assets de tienda a todos"     ON storage.objects;
DROP POLICY IF EXISTS "Permitir borrar assets de tienda a todos"     ON storage.objects;
DROP POLICY IF EXISTS "assets: lectura pública"                      ON storage.objects;
DROP POLICY IF EXISTS "assets: subir logueado"                       ON storage.objects;
DROP POLICY IF EXISTS "assets: editar logueado"                      ON storage.objects;
DROP POLICY IF EXISTS "assets: borrar logueado"                      ON storage.objects;

CREATE POLICY "assets: lectura pública"
ON storage.objects FOR SELECT
USING (bucket_id IN ('store-assets', 'product-images'));

-- Subir/editar/borrar imágenes: solo cuentas logueadas (comercios).
CREATE POLICY "assets: subir logueado"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id IN ('store-assets', 'product-images') AND auth.role() = 'authenticated');

CREATE POLICY "assets: editar logueado"
ON storage.objects FOR UPDATE
USING (bucket_id IN ('store-assets', 'product-images') AND auth.role() = 'authenticated');

CREATE POLICY "assets: borrar logueado"
ON storage.objects FOR DELETE
USING (bucket_id IN ('store-assets', 'product-images') AND auth.role() = 'authenticated');

-- ============================================================
-- 9. VERIFICACIÓN — corré esto después y revisá que no quede ningún
--    `qual = true` en orders / store_requests / products(write) / stores(write)
-- ============================================================
-- SELECT tablename, policyname, cmd, qual, with_check
-- FROM pg_policies WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;
