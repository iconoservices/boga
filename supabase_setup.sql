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
-- Columnas agregadas después del launch:
--   city     — slug de ciudad (ver src/lib/ciudades.ts). Mide demanda B2B por plaza.
--   interest — qué quiere el negocio: 'tienda' (solo su tienda propia),
--              'marketplace' (aparecer en Boga Market) o 'ambos'.
ALTER TABLE public.store_requests ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.store_requests ADD COLUMN IF NOT EXISTS interest TEXT;
CREATE INDEX IF NOT EXISTS store_requests_status_idx ON public.store_requests (status);
CREATE INDEX IF NOT EXISTS store_requests_city_idx ON public.store_requests (city);

-- ── Lista de espera por ciudad ──────────────────────────────────────────────
-- Cuando alguien abre Boga Market en una ciudad donde todavía no operamos, en
-- vez de mostrar vacío pedimos su contacto acá. Sirve para saber a dónde
-- expandir (cuánta gente y qué negocios piden Boga en cada plaza).
--   role — 'comprador' (usuario final) o 'negocio' (dueño de negocio).
CREATE TABLE IF NOT EXISTS public.city_interest (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  city TEXT NOT NULL,
  region TEXT,
  role TEXT NOT NULL DEFAULT 'comprador',
  email TEXT,
  whatsapp TEXT,
  business_name TEXT,
  note TEXT,
  source TEXT
);
CREATE INDEX IF NOT EXISTS city_interest_city_idx ON public.city_interest (city);

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
ALTER TABLE public.city_interest   ENABLE ROW LEVEL SECURITY;
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

-- Nombres NUEVOS (los que este mismo script crea más abajo). Sin esto, la
-- segunda corrida falla con "policy ... already exists" — CREATE POLICY no
-- tiene IF NOT EXISTS. Con estos DROPs el script vuelve a ser 100% idempotente.
DROP POLICY IF EXISTS "stores: lectura pública"            ON public.stores;
DROP POLICY IF EXISTS "stores: solo superadmin crea"       ON public.stores;
DROP POLICY IF EXISTS "stores: dueño o superadmin edita"   ON public.stores;
DROP POLICY IF EXISTS "stores: dueño o superadmin borra"   ON public.stores;
DROP POLICY IF EXISTS "products: lectura pública"          ON public.products;
DROP POLICY IF EXISTS "products: dueño o superadmin crea"  ON public.products;
DROP POLICY IF EXISTS "products: dueño o superadmin edita" ON public.products;
DROP POLICY IF EXISTS "products: dueño o superadmin borra" ON public.products;
DROP POLICY IF EXISTS "orders: dueño o superadmin ve"        ON public.orders;
DROP POLICY IF EXISTS "orders: dueño o superadmin crea"      ON public.orders;
DROP POLICY IF EXISTS "orders: dueño o superadmin actualiza" ON public.orders;
DROP POLICY IF EXISTS "orders: dueño o superadmin borra"     ON public.orders;
DROP POLICY IF EXISTS "store_requests: cualquiera se postula"    ON public.store_requests;
DROP POLICY IF EXISTS "store_requests: solo superadmin lee"      ON public.store_requests;
DROP POLICY IF EXISTS "store_requests: solo superadmin gestiona" ON public.store_requests;
DROP POLICY IF EXISTS "profiles: cada quien el suyo, superadmin todos" ON public.profiles;
DROP POLICY IF EXISTS "profiles: cada quien actualiza el suyo"        ON public.profiles;

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

-- city_interest: mismo patrón — cualquiera se anota, solo el superadmin lee.
DROP POLICY IF EXISTS "city_interest: cualquiera se anota"   ON public.city_interest;
DROP POLICY IF EXISTS "city_interest: solo superadmin lee"   ON public.city_interest;
DROP POLICY IF EXISTS "city_interest: solo superadmin gestiona" ON public.city_interest;

CREATE POLICY "city_interest: cualquiera se anota"
ON public.city_interest FOR INSERT
WITH CHECK (true);

CREATE POLICY "city_interest: solo superadmin lee"
ON public.city_interest FOR SELECT
USING (public.is_superadmin());

CREATE POLICY "city_interest: solo superadmin gestiona"
ON public.city_interest FOR UPDATE
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

-- ============================================================
-- 10. ROL "redactor" (para la Revista)
-- ============================================================
-- profiles.rol: NULL = cuenta común. 'redactor' = puede escribir notas de la
-- Revista, pero NO publicarlas (eso lo hace el superadmin). Se asigna solo con
-- set_rol_redactor(), nunca desde el navegador.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rol TEXT;

CREATE OR REPLACE FUNCTION public.puede_editar_revista()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND rol = 'redactor'
    )
$$;

-- Alta/baja de redactores. SECURITY DEFINER: corre con permisos del dueño de
-- la función, así que el chequeo de superadmin adentro es lo único que protege.
CREATE OR REPLACE FUNCTION public.set_rol_redactor(correo text, activar boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Solo el superadmin puede cambiar roles';
  END IF;
  UPDATE public.profiles
     SET rol = CASE WHEN activar THEN 'redactor' ELSE NULL END
   WHERE email = correo;
END;
$$;

-- La política UPDATE de profiles no tiene WITH CHECK: sin esto, un usuario
-- podría hacer `update profiles set rol='redactor' where id = auth.uid()`.
-- El trigger revierte cualquier cambio de `rol` que no venga del superadmin.
CREATE OR REPLACE FUNCTION public.profiles_protege_rol()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rol IS DISTINCT FROM OLD.rol AND NOT public.is_superadmin() THEN
    NEW.rol := OLD.rol;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_protege_rol ON public.profiles;
CREATE TRIGGER profiles_protege_rol
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_protege_rol();

-- ============================================================
-- 11. REVISTA_NOTAS  (CMS de "Yo Soy de la Selva")
-- ============================================================
CREATE TABLE IF NOT EXISTS public.revista_notas (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  kicker        TEXT NOT NULL,
  titulo        TEXT NOT NULL,
  dek           TEXT NOT NULL,
  autor_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_nombre  TEXT NOT NULL DEFAULT 'Redacción Boga',
  fecha         DATE NOT NULL DEFAULT current_date,
  lectura       TEXT NOT NULL DEFAULT '3 min',
  img           TEXT NOT NULL,
  img_credito   TEXT NOT NULL,
  cuerpo        JSONB NOT NULL DEFAULT '[]'::jsonb,
  cita          JSONB,
  ubicacion_maps TEXT,
  fuente        JSONB,
  destacado     BOOLEAN NOT NULL DEFAULT false,
  portada       BOOLEAN NOT NULL DEFAULT false,
  estado        TEXT NOT NULL DEFAULT 'borrador'
                CHECK (estado IN ('borrador', 'en_revision', 'publicada')),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT now(),
  published_at  TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS revista_notas_estado_idx ON public.revista_notas (estado);
CREATE INDEX IF NOT EXISTS revista_notas_slug_idx   ON public.revista_notas (slug);

CREATE OR REPLACE FUNCTION public.revista_notas_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS revista_notas_touch ON public.revista_notas;
CREATE TRIGGER revista_notas_touch
BEFORE UPDATE ON public.revista_notas
FOR EACH ROW EXECUTE FUNCTION public.revista_notas_touch();

ALTER TABLE public.revista_notas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "revista_notas: lectura de publicadas o propias" ON public.revista_notas;
DROP POLICY IF EXISTS "revista_notas: redactor crea en borrador"       ON public.revista_notas;
DROP POLICY IF EXISTS "revista_notas: superadmin o autor edita"        ON public.revista_notas;
DROP POLICY IF EXISTS "revista_notas: superadmin o autor borra"        ON public.revista_notas;

-- Lectura: las publicadas son públicas (sin login). Los borradores solo los ve
-- el superadmin o quien los escribió.
CREATE POLICY "revista_notas: lectura de publicadas o propias"
ON public.revista_notas FOR SELECT
USING (
  estado = 'publicada'
  OR public.is_superadmin()
  OR autor_id = auth.uid()
);

-- Crear: solo redactores/superadmin, siempre como autor de la fila. Un redactor
-- no puede crear directamente en 'publicada'; el superadmin sí.
CREATE POLICY "revista_notas: redactor crea en borrador"
ON public.revista_notas FOR INSERT
WITH CHECK (
  public.puede_editar_revista()
  AND autor_id = auth.uid()
  AND (estado <> 'publicada' OR public.is_superadmin())
);

-- Editar: el superadmin cualquier nota; el redactor solo las suyas, y no puede
-- pasarlas a 'publicada' (eso queda para el superadmin).
CREATE POLICY "revista_notas: superadmin o autor edita"
ON public.revista_notas FOR UPDATE
USING (public.is_superadmin() OR autor_id = auth.uid())
WITH CHECK (
  public.is_superadmin()
  OR (autor_id = auth.uid() AND estado <> 'publicada')
);

CREATE POLICY "revista_notas: superadmin o autor borra"
ON public.revista_notas FOR DELETE
USING (
  public.is_superadmin()
  OR (autor_id = auth.uid() AND estado <> 'publicada')
);

-- ============================================================
-- 12. TAXI SEGURO  (directorio de choferes + postulaciones)
-- ============================================================
-- `drivers`: el directorio curado de /taxi-seguro. Antes era un array
-- hardcodeado en la página. Lectura pública SOLO de status='activo'; escritura
-- solo superadmin (desde /superadmin). Leer siempre por endpoint cacheado
-- (/api/drivers) — nunca select('*') desde el cliente (ver egress).
CREATE TABLE IF NOT EXISTS public.drivers (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  nombre       TEXT NOT NULL,
  tipo         TEXT NOT NULL DEFAULT 'Mototaxi',   -- Mototaxi | Auto | Moto
  comite       TEXT,
  experiencia  TEXT,
  placa        TEXT,
  modelo       TEXT,
  sellos       JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{label, icon, fuerte?}]
  ruta         TEXT,
  precio       TEXT,
  paradero     TEXT,
  resena       TEXT,
  resena_autor TEXT,
  tel          TEXT,                                -- WhatsApp / llamada (E.164 sin +)
  img          TEXT,
  veh_img      TEXT,
  ciudad       TEXT NOT NULL DEFAULT 'pucallpa',
  orden        INT  NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'activo'       -- activo | oculto
);
CREATE INDEX IF NOT EXISTS drivers_status_idx ON public.drivers (status);
CREATE INDEX IF NOT EXISTS drivers_ciudad_idx ON public.drivers (ciudad);

-- `driver_requests`: postulaciones desde el formulario público
-- /taxi-seguro/registro. Cualquiera inserta; solo el superadmin lee/gestiona.
CREATE TABLE IF NOT EXISTS public.driver_requests (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  nombre      TEXT NOT NULL,
  whatsapp    TEXT NOT NULL,
  tipo        TEXT,
  placa       TEXT,
  zona        TEXT,
  ciudad      TEXT,
  experiencia TEXT,
  mensaje     TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'       -- pending | approved | rejected
);
CREATE INDEX IF NOT EXISTS driver_requests_status_idx ON public.driver_requests (status);

ALTER TABLE public.drivers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_requests  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drivers: lectura pública de activos" ON public.drivers;
DROP POLICY IF EXISTS "drivers: superadmin inserta"         ON public.drivers;
DROP POLICY IF EXISTS "drivers: superadmin edita"           ON public.drivers;
DROP POLICY IF EXISTS "drivers: superadmin borra"           ON public.drivers;
DROP POLICY IF EXISTS "driver_requests: cualquiera se postula"    ON public.driver_requests;
DROP POLICY IF EXISTS "driver_requests: solo superadmin lee"      ON public.driver_requests;
DROP POLICY IF EXISTS "driver_requests: solo superadmin gestiona" ON public.driver_requests;

CREATE POLICY "drivers: lectura pública de activos"
ON public.drivers FOR SELECT
USING (status = 'activo' OR public.is_superadmin());

CREATE POLICY "drivers: superadmin inserta"
ON public.drivers FOR INSERT WITH CHECK (public.is_superadmin());

CREATE POLICY "drivers: superadmin edita"
ON public.drivers FOR UPDATE USING (public.is_superadmin());

CREATE POLICY "drivers: superadmin borra"
ON public.drivers FOR DELETE USING (public.is_superadmin());

CREATE POLICY "driver_requests: cualquiera se postula"
ON public.driver_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "driver_requests: solo superadmin lee"
ON public.driver_requests FOR SELECT USING (public.is_superadmin());

CREATE POLICY "driver_requests: solo superadmin gestiona"
ON public.driver_requests FOR UPDATE USING (public.is_superadmin());

-- ============================================================
-- 13. LIBRO DE RECLAMACIONES  (D.S. 011-2011-PCM)
-- ============================================================
-- Hoja de reclamación virtual. Cualquiera inserta (con o sin login); solo el
-- superadmin lee y responde desde /superadmin/reclamaciones.
--   numero  — correlativo monotónico exigido por la norma. Se muestra como
--             "N.º 000123". IDENTITY = sin carreras aunque inserten a la vez.
--   tipo    — 'reclamo' (disconformidad con el producto/servicio) |
--             'queja'   (malestar que no busca solución sobre el producto)
--   bien    — 'producto' | 'servicio'
--   estado  — 'pendiente' | 'respondido' | 'cerrado'
CREATE TABLE IF NOT EXISTS public.reclamaciones (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero        BIGINT GENERATED BY DEFAULT AS IDENTITY,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- Consumidor
  con_nombre    TEXT NOT NULL,
  con_documento TEXT,                       -- DNI / CE / pasaporte
  con_domicilio TEXT,
  con_telefono  TEXT,
  con_email     TEXT NOT NULL,              -- para mandarle copia de la hoja
  con_menor     BOOLEAN NOT NULL DEFAULT false,
  apoderado     TEXT,                       -- nombre del padre/madre/tutor si es menor
  -- Bien contratado
  bien          TEXT NOT NULL DEFAULT 'servicio',   -- producto | servicio
  monto         NUMERIC(10,2),
  bien_detalle  TEXT,                       -- qué producto/servicio, pedido, comercio
  -- Reclamo
  tipo          TEXT NOT NULL DEFAULT 'reclamo',    -- reclamo | queja
  detalle       TEXT NOT NULL,
  pedido        TEXT,                        -- lo que el consumidor solicita
  -- Gestión interna
  estado        TEXT NOT NULL DEFAULT 'pendiente',
  respuesta     TEXT,
  respondido_at TIMESTAMP WITH TIME ZONE,
  canal         TEXT DEFAULT 'web'
);
CREATE INDEX IF NOT EXISTS reclamaciones_estado_idx ON public.reclamaciones (estado);
CREATE INDEX IF NOT EXISTS reclamaciones_numero_idx ON public.reclamaciones (numero);

ALTER TABLE public.reclamaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reclamaciones: cualquiera presenta"   ON public.reclamaciones;
DROP POLICY IF EXISTS "reclamaciones: solo superadmin lee"   ON public.reclamaciones;
DROP POLICY IF EXISTS "reclamaciones: solo superadmin gestiona" ON public.reclamaciones;

CREATE POLICY "reclamaciones: cualquiera presenta"
ON public.reclamaciones FOR INSERT WITH CHECK (true);

CREATE POLICY "reclamaciones: solo superadmin lee"
ON public.reclamaciones FOR SELECT USING (public.is_superadmin());

CREATE POLICY "reclamaciones: solo superadmin gestiona"
ON public.reclamaciones FOR UPDATE USING (public.is_superadmin());

-- La hoja se presenta por esta función (SECURITY DEFINER) para poder DEVOLVER
-- el número correlativo: con RLS, un anónimo no puede leer de vuelta la fila
-- que acaba de insertar. La app llama supabase.rpc('presentar_reclamacion', { p }).
CREATE OR REPLACE FUNCTION public.presentar_reclamacion(p jsonb)
RETURNS TABLE (numero bigint, id uuid, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF COALESCE(p->>'con_nombre','') = '' OR COALESCE(p->>'con_email','') = ''
     OR COALESCE(p->>'detalle','') = '' THEN
    RAISE EXCEPTION 'Faltan campos obligatorios (nombre, correo, detalle).';
  END IF;

  RETURN QUERY
  INSERT INTO public.reclamaciones (
    con_nombre, con_documento, con_domicilio, con_telefono, con_email, con_menor, apoderado,
    bien, monto, bien_detalle, tipo, detalle, pedido, canal
  ) VALUES (
    p->>'con_nombre', NULLIF(p->>'con_documento',''), NULLIF(p->>'con_domicilio',''),
    NULLIF(p->>'con_telefono',''), p->>'con_email',
    COALESCE((p->>'con_menor')::boolean, false), NULLIF(p->>'apoderado',''),
    COALESCE(NULLIF(p->>'bien',''),'servicio'), NULLIF(p->>'monto','')::numeric,
    NULLIF(p->>'bien_detalle',''), COALESCE(NULLIF(p->>'tipo',''),'reclamo'),
    p->>'detalle', NULLIF(p->>'pedido',''), COALESCE(NULLIF(p->>'canal',''),'web')
  )
  RETURNING reclamaciones.numero, reclamaciones.id, reclamaciones.created_at;
END;
$$;
GRANT EXECUTE ON FUNCTION public.presentar_reclamacion(jsonb) TO anon, authenticated;
