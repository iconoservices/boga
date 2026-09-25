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
  show_demo_products BOOLEAN DEFAULT false,
  zona TEXT,
  direccion TEXT,
  horario TEXT,
  rating NUMERIC(2,1),
  metodos_pago TEXT[],
  facebook TEXT,
  instagram TEXT,
  tiktok TEXT,
  external_url TEXT,
  status TEXT DEFAULT 'active'
);

-- Migraciones para tablas que ya existían (columnas agregadas después del launch)
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS logo_image TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS show_demo_products BOOLEAN DEFAULT false;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS zona TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS horario TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1);
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS metodos_pago TEXT[];
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS facebook TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS tiktok TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS external_url TEXT;

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

-- Banners de los carruseles de portada (/market Y el Inicio "/"). Antes
-- vivian hardcodeados en el codigo (BANNERS_RAW en market/page.tsx,
-- PROMO_SLIDES en page.tsx); ahora los edita el superadmin sin tocar codigo.
-- `page` distingue en cual de los dos carruseles aparece cada uno.
CREATE TABLE IF NOT EXISTS public.market_banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  image TEXT NOT NULL,
  tag TEXT,
  title1 TEXT NOT NULL,
  title2 TEXT,
  sub TEXT,
  /** A donde lleva al tocarlo: interno (/promotions) o externo. Vacio = no clickeable. */
  link TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  page TEXT DEFAULT 'market'
);
CREATE INDEX IF NOT EXISTS market_banners_sort_idx ON public.market_banners (sort_order);
ALTER TABLE public.market_banners ADD COLUMN IF NOT EXISTS page TEXT DEFAULT 'market';
-- Oculta el tag/titulos/sub sin borrarlos (para cuando la imagen ya trae el
-- texto dibujado pero se quiere guardar el texto igual, por si despues se
-- vuelve a mostrar).
ALTER TABLE public.market_banners ADD COLUMN IF NOT EXISTS show_text BOOLEAN DEFAULT true;

-- Estilo visual del carrusel de CADA seccion (no de cada banner individual):
-- 'center' = texto centrado con degradado desde la izquierda (el look de
-- siempre de /market); 'bottom' = texto pegado abajo con degradado desde
-- abajo (el look de siempre del Inicio). Sin fila para una pagina, el
-- default en el codigo es 'center' para market y 'bottom' para home (los
-- que ya tenian hardcodeados).
CREATE TABLE IF NOT EXISTS public.banner_page_settings (
  page TEXT PRIMARY KEY,
  style TEXT NOT NULL DEFAULT 'center'
);

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
ALTER TABLE public.market_banners  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banner_page_settings ENABLE ROW LEVEL SECURITY;

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

-- market_banners: lectura pública (el carrusel de /market lo ve cualquiera),
-- solo el superadmin lo edita.
DROP POLICY IF EXISTS "market_banners: lectura pública" ON public.market_banners;
DROP POLICY IF EXISTS "market_banners: solo superadmin gestiona" ON public.market_banners;

CREATE POLICY "market_banners: lectura pública"
ON public.market_banners FOR SELECT
USING (true);

CREATE POLICY "market_banners: solo superadmin gestiona"
ON public.market_banners FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- banner_page_settings: mismo patron (lectura publica, solo superadmin edita).
DROP POLICY IF EXISTS "banner_page_settings: lectura pública" ON public.banner_page_settings;
DROP POLICY IF EXISTS "banner_page_settings: solo superadmin gestiona" ON public.banner_page_settings;

CREATE POLICY "banner_page_settings: lectura pública"
ON public.banner_page_settings FOR SELECT
USING (true);

CREATE POLICY "banner_page_settings: solo superadmin gestiona"
ON public.banner_page_settings FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

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

-- ============================================================
-- 14. ALQUILERES  (directorio de habitaciones, mini-dptos, casas y pensiones)
-- ============================================================
-- `rental_listings`: el directorio curado de /alquileres ("Dónde quedarte").
-- Antes era un array hardcodeado en la página. Lectura pública SOLO de
-- status='activo'; escritura solo superadmin (desde /superadmin/alquileres).
-- Leer siempre por endpoint cacheado (/api/alquileres) — nunca select('*')
-- desde el cliente (ver egress).
CREATE TABLE IF NOT EXISTS public.rental_listings (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  tipo                TEXT NOT NULL DEFAULT 'Habitación', -- Habitación | Mini-dpto | Casa | Pensión
  titulo              TEXT NOT NULL,
  descripcion         TEXT,                                -- texto largo para la ficha ampliada
  zona                TEXT,
  precio              NUMERIC(10,2) NOT NULL DEFAULT 0,   -- soles / mes
  extras              JSONB NOT NULL DEFAULT '[]'::jsonb, -- ["Baño propio", "Wifi", ...]
  incluye_servicios   BOOLEAN NOT NULL DEFAULT false,
  incluye_comidas     BOOLEAN NOT NULL DEFAULT false,
  verificado          BOOLEAN NOT NULL DEFAULT false,
  wsp                 TEXT,                                -- WhatsApp (E.164 sin +)
  img                 TEXT,
  ciudad              TEXT NOT NULL DEFAULT 'pucallpa',
  orden               INT  NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'activo'        -- activo | oculto
);
CREATE INDEX IF NOT EXISTS rental_listings_status_idx ON public.rental_listings (status);
CREATE INDEX IF NOT EXISTS rental_listings_ciudad_idx ON public.rental_listings (ciudad);

-- Migracion: `rental_listings` ya existia sin esta columna cuando se agrego la ficha ampliada.
ALTER TABLE public.rental_listings ADD COLUMN IF NOT EXISTS descripcion TEXT;

ALTER TABLE public.rental_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rental_listings: lectura pública de activos" ON public.rental_listings;
DROP POLICY IF EXISTS "rental_listings: superadmin inserta"         ON public.rental_listings;
DROP POLICY IF EXISTS "rental_listings: superadmin edita"           ON public.rental_listings;
DROP POLICY IF EXISTS "rental_listings: superadmin borra"           ON public.rental_listings;

CREATE POLICY "rental_listings: lectura pública de activos"
ON public.rental_listings FOR SELECT
USING (status = 'activo' OR public.is_superadmin());

CREATE POLICY "rental_listings: superadmin inserta"
ON public.rental_listings FOR INSERT WITH CHECK (public.is_superadmin());

CREATE POLICY "rental_listings: superadmin edita"
ON public.rental_listings FOR UPDATE USING (public.is_superadmin());

CREATE POLICY "rental_listings: superadmin borra"
ON public.rental_listings FOR DELETE USING (public.is_superadmin());

-- ============================================================
-- 15. EVENTOS  (agenda de Pucallpa)
-- ============================================================
-- `events`: la agenda de /eventos. Antes era un array hardcodeado en la
-- pagina. Lectura publica SOLO de status='activo'; escritura solo superadmin
-- (desde /superadmin/eventos). Leer siempre por endpoint cacheado
-- (/api/eventos) — nunca select('*') desde el cliente (ver egress).
CREATE TABLE IF NOT EXISTS public.events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  titulo      TEXT NOT NULL,
  categoria   TEXT NOT NULL DEFAULT 'Fiestas',  -- una de las categorias fijas de /eventos
  descripcion TEXT,                              -- texto largo para la ficha ampliada
  lugar       TEXT,
  dia         TEXT,                              -- "12" (numero de dia, como texto para el formato de la tarjeta)
  mes         TEXT,                              -- "SEP" (3 letras mayusculas)
  -- Fecha real (con año), opcional: si esta cargada y ya paso, el evento se
  -- oculta solo de /eventos sin que el superadmin tenga que acordarse. Si
  -- queda vacia (eventos viejos, o el superadmin prefiere ocultar a mano),
  -- no cambia nada del comportamiento anterior.
  fecha       DATE,
  precio      TEXT,                              -- "S/ 30" o "Libre"
  organiza    TEXT,
  img         TEXT,
  destacado   BOOLEAN NOT NULL DEFAULT false,     -- aparece en el carrusel de arriba
  ciudad      TEXT NOT NULL DEFAULT 'pucallpa',
  orden       INT  NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'activo'      -- activo | oculto
);
CREATE INDEX IF NOT EXISTS events_status_idx ON public.events (status);
CREATE INDEX IF NOT EXISTS events_ciudad_idx ON public.events (ciudad);

-- Migracion: `events` ya existia sin esta columna cuando se agrego la ficha ampliada.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS descripcion TEXT;
-- Migracion: `events` ya existia sin esta columna cuando se agrego el ocultado automatico.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS fecha DATE;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events: lectura publica de activos" ON public.events;
DROP POLICY IF EXISTS "events: superadmin inserta"          ON public.events;
DROP POLICY IF EXISTS "events: superadmin edita"             ON public.events;
DROP POLICY IF EXISTS "events: superadmin borra"             ON public.events;

CREATE POLICY "events: lectura publica de activos"
ON public.events FOR SELECT
USING (status = 'activo' OR public.is_superadmin());

CREATE POLICY "events: superadmin inserta"
ON public.events FOR INSERT WITH CHECK (public.is_superadmin());

CREATE POLICY "events: superadmin edita"
ON public.events FOR UPDATE USING (public.is_superadmin());

CREATE POLICY "events: superadmin borra"
ON public.events FOR DELETE USING (public.is_superadmin());

-- `places`: "¿A dónde ir en Pucallpa?" en /eventos — lugares para visitar sin
-- fecha fija (turismo local), separado de `events` porque no tiene ni
-- categoria ni precio ni organizador, es una ficha mucho mas simple.
CREATE TABLE IF NOT EXISTS public.places (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  nombre      TEXT NOT NULL,
  tag         TEXT,                              -- "Naturaleza · medio día"
  descripcion TEXT,                              -- texto largo para la ficha ampliada
  img         TEXT,
  ciudad      TEXT NOT NULL DEFAULT 'pucallpa',
  orden       INT  NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'activo'      -- activo | oculto
);
CREATE INDEX IF NOT EXISTS places_status_idx ON public.places (status);
CREATE INDEX IF NOT EXISTS places_ciudad_idx ON public.places (ciudad);

-- Migracion: `places` ya existia sin esta columna cuando se agrego la ficha ampliada.
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS descripcion TEXT;

ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "places: lectura publica de activos" ON public.places;
DROP POLICY IF EXISTS "places: superadmin inserta"          ON public.places;
DROP POLICY IF EXISTS "places: superadmin edita"             ON public.places;
DROP POLICY IF EXISTS "places: superadmin borra"             ON public.places;

CREATE POLICY "places: lectura publica de activos"
ON public.places FOR SELECT
USING (status = 'activo' OR public.is_superadmin());

CREATE POLICY "places: superadmin inserta"
ON public.places FOR INSERT WITH CHECK (public.is_superadmin());

CREATE POLICY "places: superadmin edita"
ON public.places FOR UPDATE USING (public.is_superadmin());

CREATE POLICY "places: superadmin borra"
ON public.places FOR DELETE USING (public.is_superadmin());

-- ============================================================
-- 16. VENTAS  (inmuebles en venta, pestaña "En Venta" de /inmuebles)
-- ============================================================
-- `sale_listings`: terrenos, lotes, casas y chacras en venta. Antes era un
-- array hardcodeado (VENTAS_SEED) en la página. Mismo patrón que
-- `rental_listings`: lectura pública SOLO de status='activo'; escritura solo
-- superadmin. Leer siempre por endpoint cacheado (/api/ventas) — nunca
-- select('*') desde el cliente (ver egress).
CREATE TABLE IF NOT EXISTS public.sale_listings (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  tipo        TEXT NOT NULL DEFAULT 'Terreno',   -- Terreno | Lote | Casa | Chacra
  titulo      TEXT NOT NULL,
  descripcion TEXT,                               -- texto largo para la ficha ampliada
  zona        TEXT,
  precio      NUMERIC(12,2) NOT NULL DEFAULT 0,
  moneda      TEXT NOT NULL DEFAULT 'PEN',         -- PEN | USD
  area        TEXT,                                -- "200 m²", "5 ha"
  extras      JSONB NOT NULL DEFAULT '[]'::jsonb,  -- ["Título saneado", "Agua y luz", ...]
  wsp         TEXT,                                -- WhatsApp (E.164 sin +)
  img         TEXT,
  ciudad      TEXT NOT NULL DEFAULT 'pucallpa',
  orden       INT  NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'activo'        -- activo | oculto
);
CREATE INDEX IF NOT EXISTS sale_listings_status_idx ON public.sale_listings (status);
CREATE INDEX IF NOT EXISTS sale_listings_ciudad_idx ON public.sale_listings (ciudad);

ALTER TABLE public.sale_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sale_listings: lectura publica de activos" ON public.sale_listings;
DROP POLICY IF EXISTS "sale_listings: superadmin inserta"         ON public.sale_listings;
DROP POLICY IF EXISTS "sale_listings: superadmin edita"           ON public.sale_listings;
DROP POLICY IF EXISTS "sale_listings: superadmin borra"           ON public.sale_listings;

CREATE POLICY "sale_listings: lectura publica de activos"
ON public.sale_listings FOR SELECT
USING (status = 'activo' OR public.is_superadmin());

CREATE POLICY "sale_listings: superadmin inserta"
ON public.sale_listings FOR INSERT WITH CHECK (public.is_superadmin());

CREATE POLICY "sale_listings: superadmin edita"
ON public.sale_listings FOR UPDATE USING (public.is_superadmin());

CREATE POLICY "sale_listings: superadmin borra"
ON public.sale_listings FOR DELETE USING (public.is_superadmin());

-- ============================================================
-- 17. TICKETING DE EVENTOS  (reservas con QR para /eventos)
-- ============================================================
-- MVP sin pago online: un evento marcado `reservable=true` deja reservar
-- entrada con nombre (+telefono opcional), sin plata de por medio — se paga
-- en puerta. La reserva genera un `tickets.token` unico que se codifica en
-- un QR (qrcode.react, ya instalado). En la puerta, /eventos/validar lo
-- escanea (html5-qrcode) y llama a validar_ticket, que marca 'usado' de
-- forma atomica: 1 fila afectada = valido, 0 = ya usado. Sin promotores ni
-- pasarela de pago todavia (nivel 2 — ver memoria eventos-ticketing).
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS reservable BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS aforo INT;  -- limite de tickets; NULL = sin limite

-- Enlace externo de entradas o registro (ej. Novikpass). Si está, el detalle del
-- evento muestra el botón "Comprar entradas" que abre ese enlace.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS link_entradas TEXT;
-- UPDATE public.events SET link_entradas = 'https://fiestasbravas.novikpass.com/r/FIESBRAV'
--   WHERE titulo ILIKE '%Lil Silvio%';

-- Enlace a la publicación o post original (Facebook, Instagram, etc.). Si está,
-- se muestra el botón "Ver post original" en la agenda pública.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS link_post_original TEXT;

CREATE TABLE IF NOT EXISTS public.tickets (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  telefono    TEXT,
  token       TEXT NOT NULL UNIQUE,               -- va codificado en el QR
  estado      TEXT NOT NULL DEFAULT 'valido',      -- valido | usado
  usado_at    TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS tickets_event_idx ON public.tickets (event_id);
CREATE INDEX IF NOT EXISTS tickets_token_idx ON public.tickets (token);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets: solo superadmin lee" ON public.tickets;

CREATE POLICY "tickets: solo superadmin lee"
ON public.tickets FOR SELECT USING (public.is_superadmin());

-- Sin policy publica de INSERT/UPDATE: los tickets se crean y validan solo
-- a traves de las dos funciones de abajo (SECURITY DEFINER), que ademas
-- chequean aforo y estado del evento de forma atomica.

-- Reserva una entrada: valida que el evento admita reservas, chequea el
-- aforo bloqueando la fila del evento (FOR UPDATE) para que dos reservas
-- simultaneas no lo pasen, y devuelve el token para armar el QR.
CREATE OR REPLACE FUNCTION public.reservar_ticket(p jsonb)
RETURNS TABLE (id uuid, token text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_event_id   uuid := (p->>'event_id')::uuid;
  v_nombre     text := p->>'nombre';
  v_aforo      int;
  v_status     text;
  v_reservable boolean;
  v_vendidos   int;
  v_token      text;
BEGIN
  IF v_event_id IS NULL OR COALESCE(v_nombre,'') = '' THEN
    RAISE EXCEPTION 'Faltan datos (evento o nombre).';
  END IF;

  SELECT events.aforo, events.status, events.reservable
  INTO v_aforo, v_status, v_reservable
  FROM public.events WHERE events.id = v_event_id
  FOR UPDATE;

  IF NOT FOUND OR v_status <> 'activo' OR NOT v_reservable THEN
    RAISE EXCEPTION 'Este evento ya no admite reservas.';
  END IF;

  IF v_aforo IS NOT NULL THEN
    SELECT count(*) INTO v_vendidos FROM public.tickets WHERE tickets.event_id = v_event_id;
    IF v_vendidos >= v_aforo THEN
      RAISE EXCEPTION 'Se agotaron las entradas para este evento.';
    END IF;
  END IF;

  v_token := encode(gen_random_bytes(16), 'hex');

  RETURN QUERY
  INSERT INTO public.tickets (event_id, nombre, telefono, token)
  VALUES (v_event_id, v_nombre, NULLIF(p->>'telefono',''), v_token)
  RETURNING tickets.id, tickets.token, tickets.created_at;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reservar_ticket(jsonb) TO anon, authenticated;

-- Valida una entrada en la puerta: marca el ticket 'usado' de forma atomica.
-- Solo superadmin por ahora (promotores es nivel 2). Devuelve un resultado
-- para que /eventos/validar muestre valido / ya_usado / no_encontrado.
CREATE OR REPLACE FUNCTION public.validar_ticket(p_token text)
RETURNS TABLE (resultado text, evento_titulo text, nombre text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id     uuid;
  v_estado text;
  v_evento text;
  v_nombre text;
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'No autorizado.';
  END IF;

  SELECT tickets.id, tickets.estado, events.titulo, tickets.nombre
  INTO v_id, v_estado, v_evento, v_nombre
  FROM public.tickets
  JOIN public.events ON events.id = tickets.event_id
  WHERE tickets.token = p_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'no_encontrado'::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  IF v_estado = 'usado' THEN
    RETURN QUERY SELECT 'ya_usado'::text, v_evento, v_nombre;
    RETURN;
  END IF;

  UPDATE public.tickets SET estado = 'usado', usado_at = now() WHERE tickets.id = v_id;
  RETURN QUERY SELECT 'valido'::text, v_evento, v_nombre;
END;
$$;
GRANT EXECUTE ON FUNCTION public.validar_ticket(text) TO authenticated;

-- ============================================================
-- 18. ORGANIZADORES  (discotecas / productoras — espacio /org/[slug])
-- ============================================================
-- `organizers`: cada discoteca u organizadora tiene su espacio publico en
-- /org/<slug> (estilo NovikPass). Lectura publica SOLO de status='activo';
-- escritura solo superadmin (desde /superadmin/organizadores). Fase 1: solo
-- el registro; ligar eventos (events.organizer_id), PINs de staff y
-- promotores vienen despues.
CREATE TABLE IF NOT EXISTS public.organizers (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  slug        TEXT UNIQUE NOT NULL,               -- /org/<slug>
  nombre      TEXT NOT NULL,
  tagline     TEXT,                                -- "Discoteca · Av. San Martín"
  color       TEXT NOT NULL DEFAULT '#d4af37',     -- acento del espacio
  logo        TEXT,
  ciudad      TEXT NOT NULL DEFAULT 'pucallpa',
  orden       INT  NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'activo'       -- activo | oculto
);
CREATE INDEX IF NOT EXISTS organizers_status_idx ON public.organizers (status);

ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizers: lectura publica de activos" ON public.organizers;
DROP POLICY IF EXISTS "organizers: superadmin inserta"         ON public.organizers;
DROP POLICY IF EXISTS "organizers: superadmin edita"           ON public.organizers;
DROP POLICY IF EXISTS "organizers: superadmin borra"           ON public.organizers;

CREATE POLICY "organizers: lectura publica de activos"
ON public.organizers FOR SELECT
USING (status = 'activo' OR public.is_superadmin());

CREATE POLICY "organizers: superadmin inserta"
ON public.organizers FOR INSERT WITH CHECK (public.is_superadmin());

CREATE POLICY "organizers: superadmin edita"
ON public.organizers FOR UPDATE USING (public.is_superadmin());

CREATE POLICY "organizers: superadmin borra"
ON public.organizers FOR DELETE USING (public.is_superadmin());

-- Fase 2: cada evento puede pertenecer a un organizador (sus "proximas
-- noches" en /org/<slug>). NULL = evento suelto de la agenda general.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES public.organizers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS events_organizer_idx ON public.events (organizer_id);


-- ============================================================
-- 16. VIAJES & TRANSPORTE  (rutas desde Pucallpa)
-- ============================================================
-- `travel_routes`: el directorio de /viajes (rápidos fluviales, buses, vuelos).
-- Antes era un array hardcodeado. Lectura pública SOLO de status='activo';
-- escritura solo superadmin (desde /superadmin/viajes). Leer siempre por el
-- endpoint cacheado /api/viajes — nunca select('*') desde el cliente (egress).
CREATE TABLE IF NOT EXISTS public.travel_routes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  medio       TEXT NOT NULL DEFAULT 'terrestre',   -- fluvial | terrestre | aereo
  destino     TEXT NOT NULL,
  via         TEXT,                                 -- "Río Ucayali · Puerto Henry"
  agencia     TEXT,
  duracion    TEXT,                                 -- "~10–12 h"
  frecuencia  TEXT,                                 -- "Diario, 5:00 AM"
  precio      TEXT,                                 -- "S/ 80–120"
  wsp         TEXT,                                 -- 51999999999
  notas       TEXT,
  ciudad      TEXT NOT NULL DEFAULT 'pucallpa',
  orden       INT  NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'activo'        -- activo | oculto
);

CREATE INDEX IF NOT EXISTS travel_routes_status_idx ON public.travel_routes (status);
CREATE INDEX IF NOT EXISTS travel_routes_medio_idx  ON public.travel_routes (medio);

ALTER TABLE public.travel_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_routes: lectura pública de activas" ON public.travel_routes;
DROP POLICY IF EXISTS "travel_routes: superadmin inserta"         ON public.travel_routes;
DROP POLICY IF EXISTS "travel_routes: superadmin edita"           ON public.travel_routes;
DROP POLICY IF EXISTS "travel_routes: superadmin borra"           ON public.travel_routes;

CREATE POLICY "travel_routes: lectura pública de activas"
ON public.travel_routes FOR SELECT
USING (status = 'activo' OR public.is_superadmin());

CREATE POLICY "travel_routes: superadmin inserta"
ON public.travel_routes FOR INSERT WITH CHECK (public.is_superadmin());

CREATE POLICY "travel_routes: superadmin edita"
ON public.travel_routes FOR UPDATE USING (public.is_superadmin());

CREATE POLICY "travel_routes: superadmin borra"
ON public.travel_routes FOR DELETE USING (public.is_superadmin());


-- ============================================================
-- 17. CHAMBA Y OFICIOS  (empleos + técnicos/oficios de /servicios)
-- ============================================================
-- `job_listings` (avisos de empleo) y `service_providers` (gente que ofrece su
-- oficio). Antes eran arrays hardcodeados en /servicios. Lectura pública SOLO de
-- status='activo'; escritura solo superadmin (desde /superadmin/chamba). Leer
-- siempre por el endpoint cacheado /api/chamba (egress).
CREATE TABLE IF NOT EXISTS public.job_listings (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  puesto      TEXT NOT NULL,
  negocio     TEXT,
  tipo        TEXT,                                 -- "Tiempo completo", "Medio tiempo", "Por día"…
  zona        TEXT,
  pago        TEXT,                                 -- "S/ 1200 + propinas", "A convenir"
  wsp         TEXT,
  ciudad      TEXT NOT NULL DEFAULT 'pucallpa',
  orden       INT  NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'activo'
);

CREATE TABLE IF NOT EXISTS public.service_providers (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  nombre      TEXT NOT NULL,
  oficio      TEXT NOT NULL,                        -- "Electricista domiciliario"
  zona        TEXT,
  img         TEXT,
  wsp         TEXT,
  ciudad      TEXT NOT NULL DEFAULT 'pucallpa',
  orden       INT  NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'activo'
);

CREATE INDEX IF NOT EXISTS job_listings_status_idx     ON public.job_listings (status);
CREATE INDEX IF NOT EXISTS service_providers_status_idx ON public.service_providers (status);

ALTER TABLE public.job_listings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_listings: lectura pública de activos" ON public.job_listings;
DROP POLICY IF EXISTS "job_listings: superadmin inserta"         ON public.job_listings;
DROP POLICY IF EXISTS "job_listings: superadmin edita"           ON public.job_listings;
DROP POLICY IF EXISTS "job_listings: superadmin borra"           ON public.job_listings;
CREATE POLICY "job_listings: lectura pública de activos" ON public.job_listings FOR SELECT USING (status = 'activo' OR public.is_superadmin());
CREATE POLICY "job_listings: superadmin inserta" ON public.job_listings FOR INSERT WITH CHECK (public.is_superadmin());
CREATE POLICY "job_listings: superadmin edita"   ON public.job_listings FOR UPDATE USING (public.is_superadmin());
CREATE POLICY "job_listings: superadmin borra"   ON public.job_listings FOR DELETE USING (public.is_superadmin());

DROP POLICY IF EXISTS "service_providers: lectura pública de activos" ON public.service_providers;
DROP POLICY IF EXISTS "service_providers: superadmin inserta"         ON public.service_providers;
DROP POLICY IF EXISTS "service_providers: superadmin edita"           ON public.service_providers;
DROP POLICY IF EXISTS "service_providers: superadmin borra"           ON public.service_providers;
CREATE POLICY "service_providers: lectura pública de activos" ON public.service_providers FOR SELECT USING (status = 'activo' OR public.is_superadmin());
CREATE POLICY "service_providers: superadmin inserta" ON public.service_providers FOR INSERT WITH CHECK (public.is_superadmin());
CREATE POLICY "service_providers: superadmin edita"   ON public.service_providers FOR UPDATE USING (public.is_superadmin());
CREATE POLICY "service_providers: superadmin borra"   ON public.service_providers FOR DELETE USING (public.is_superadmin());

-- Los empleos vencen solos: cada aviso nuevo dura 30 días (se puede renovar desde
-- /superadmin/chamba). Pasada `expira_el`, /api/chamba deja de mostrarlo.
ALTER TABLE public.job_listings ADD COLUMN IF NOT EXISTS expira_el DATE DEFAULT (CURRENT_DATE + 30);
UPDATE public.job_listings SET expira_el = created_at::date + 30 WHERE expira_el IS NULL;

-- Enlace opcional del empleo (publicación, post, formulario…). Si está, el botón
-- "Postular" de /servicios lleva ahí en vez de a WhatsApp.
ALTER TABLE public.job_listings ADD COLUMN IF NOT EXISTS link TEXT;

-- Imagen opcional del empleo (el flyer del aviso). Se muestra en la tarjeta.
ALTER TABLE public.job_listings ADD COLUMN IF NOT EXISTS img TEXT;

-- Descripción (requisitos, funciones, beneficios) y correo de contacto del empleo.
ALTER TABLE public.job_listings ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE public.job_listings ADD COLUMN IF NOT EXISTS email TEXT;

-- Fecha de publicación del aviso (la real, si se conoce). Si queda vacía, la
-- tarjeta usa el día en que se subió (created_at). Alimenta "Publicado hace N días".
ALTER TABLE public.job_listings ADD COLUMN IF NOT EXISTS publicado_el DATE;


-- ============================================================
-- 18. SORTEOS  (rifas patrocinadas con contador de tickets)
-- ============================================================
-- `raffles`: un sorteo (premio, patrocinador, meta de tickets). `raffle_tickets`:
-- un ticket por fila. El contador es el COUNT de tickets (no se guarda aparte,
-- así nunca se descuadra). Cuando los tickets llegan a `meta_tickets` el sorteo
-- se hace solo (al azar, en el servidor) y queda guardado el ganador.
--
-- Lectura pública SOLO de sorteos abiertos o ya sorteados. Los tickets (que llevan
-- nombre y WhatsApp) los ve solo el superadmin; la web pública consulta el conteo
-- por /api/sorteos (con la llave del servidor) y nunca expone datos personales.
--
-- OJO LEGAL: en Perú las rifas y sorteos entre el público pueden requerir
-- autorización. Confirmarlo con un abogado antes de vender tickets.
CREATE TABLE IF NOT EXISTS public.raffles (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  titulo            TEXT NOT NULL,                 -- "Reloj Poedagar 613"
  descripcion       TEXT,
  img               TEXT,
  patrocinador      TEXT,                          -- "Delva"
  como_participar   TEXT,                          -- "Cada S/ 20 en compras = 1 ticket"
  precio_ticket     TEXT,                          -- informativo: "S/ 5" o "Gratis con tus compras"
  meta_tickets      INT  CHECK (meta_tickets IS NULL OR meta_tickets > 0),  -- NULL = sin límite de tickets
  cierra_el         DATE,                          -- fecha límite opcional
  status            TEXT NOT NULL DEFAULT 'borrador',  -- borrador | abierto | sorteado | oculto
  ganador_ticket_id UUID,
  sorteado_el       TIMESTAMP WITH TIME ZONE,
  ciudad            TEXT NOT NULL DEFAULT 'pucallpa',
  orden             INT  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.raffle_tickets (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  raffle_id   UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  numero      INT  NOT NULL,                       -- 1, 2, 3… dentro de cada sorteo
  nombre      TEXT NOT NULL,
  whatsapp    TEXT,
  nota        TEXT,
  UNIQUE (raffle_id, numero)
);

CREATE INDEX IF NOT EXISTS raffle_tickets_raffle_idx ON public.raffle_tickets (raffle_id);
CREATE INDEX IF NOT EXISTS raffles_status_idx ON public.raffles (status);

ALTER TABLE public.raffles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "raffles: lectura pública de abiertos y sorteados" ON public.raffles;
DROP POLICY IF EXISTS "raffles: superadmin inserta" ON public.raffles;
DROP POLICY IF EXISTS "raffles: superadmin edita"   ON public.raffles;
DROP POLICY IF EXISTS "raffles: superadmin borra"   ON public.raffles;
CREATE POLICY "raffles: lectura pública de abiertos y sorteados" ON public.raffles FOR SELECT USING (status IN ('abierto','sorteado') OR public.is_superadmin());
CREATE POLICY "raffles: superadmin inserta" ON public.raffles FOR INSERT WITH CHECK (public.is_superadmin());
CREATE POLICY "raffles: superadmin edita"   ON public.raffles FOR UPDATE USING (public.is_superadmin());
CREATE POLICY "raffles: superadmin borra"   ON public.raffles FOR DELETE USING (public.is_superadmin());

DROP POLICY IF EXISTS "raffle_tickets: solo superadmin lee"    ON public.raffle_tickets;
DROP POLICY IF EXISTS "raffle_tickets: solo superadmin inserta" ON public.raffle_tickets;
DROP POLICY IF EXISTS "raffle_tickets: solo superadmin edita"   ON public.raffle_tickets;
DROP POLICY IF EXISTS "raffle_tickets: solo superadmin borra"   ON public.raffle_tickets;
CREATE POLICY "raffle_tickets: solo superadmin lee"     ON public.raffle_tickets FOR SELECT USING (public.is_superadmin());
CREATE POLICY "raffle_tickets: solo superadmin inserta" ON public.raffle_tickets FOR INSERT WITH CHECK (public.is_superadmin());
CREATE POLICY "raffle_tickets: solo superadmin edita"   ON public.raffle_tickets FOR UPDATE USING (public.is_superadmin());
CREATE POLICY "raffle_tickets: solo superadmin borra"   ON public.raffle_tickets FOR DELETE USING (public.is_superadmin());

-- La meta de tickets es OPCIONAL: hay sorteos con tope de tickets (se sortean solos al
-- llenarse) y sorteos sin tope (se sortean a mano, en la fecha que se decida).
-- Migración para quien ya creó la tabla con la meta obligatoria:
ALTER TABLE public.raffles ALTER COLUMN meta_tickets DROP NOT NULL;
ALTER TABLE public.raffles DROP CONSTRAINT IF EXISTS raffles_meta_tickets_check;
ALTER TABLE public.raffles ADD CONSTRAINT raffles_meta_tickets_check CHECK (meta_tickets IS NULL OR meta_tickets > 0);

-- Subdominio propio por tienda (plan de pago): <slug>.bogahub.app solo funciona si esto es true.
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS subdominio_activo BOOLEAN DEFAULT false;

-- ============================================================
-- TAXI SEGURO — drivers + driver_requests
-- ============================================================
-- drivers          → directorio de choferes verificados que aparece en /taxi-seguro.
--                    Solo el superadmin puede crear/editar/borrar. Lectura pública
--                    para los que tienen status = 'activo'.
-- driver_requests  → postulaciones enviadas desde el formulario público /taxi-seguro#postular.
--                    Cualquier visitante puede insertar. Solo el superadmin puede leer,
--                    editar (aprobar/rechazar) y borrar.

CREATE TABLE IF NOT EXISTS public.drivers (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  nombre       TEXT NOT NULL,
  tipo         TEXT NOT NULL DEFAULT 'Mototaxi',   -- Mototaxi | Auto | Moto
  comite       TEXT,                                -- comité o unidad
  experiencia  TEXT,                                -- "3 años", "desde 2020", etc.
  placa        TEXT,
  modelo       TEXT,                                -- "Honda Wave 110", etc.
  sellos       JSONB DEFAULT '[]'::jsonb,           -- [{label, icon, fuerte?}]
  ruta         TEXT,                                -- ruta habitual
  precio       TEXT,                                -- tarifa referencial "S/ 4 – S/ 5"
  paradero     TEXT,
  resena       TEXT,                                -- reseña de un vecino
  resena_autor TEXT,
  tel          TEXT,                                -- E.164 sin +, p.ej. 51962000001
  img          TEXT,                                -- URL foto del chofer
  veh_img      TEXT,                                -- URL foto del vehículo
  ciudad       TEXT NOT NULL DEFAULT 'pucallpa',
  orden        INT  NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'activo'       -- activo | oculto
);

CREATE INDEX IF NOT EXISTS drivers_ciudad_idx ON public.drivers (ciudad);
CREATE INDEX IF NOT EXISTS drivers_status_idx ON public.drivers (status);

CREATE TABLE IF NOT EXISTS public.driver_requests (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  nombre       TEXT NOT NULL,
  tipo         TEXT NOT NULL DEFAULT 'Mototaxi',
  zona         TEXT,
  placa        TEXT,
  experiencia  TEXT,
  whatsapp     TEXT,
  mensaje      TEXT,
  ciudad       TEXT NOT NULL DEFAULT 'pucallpa',
  status       TEXT NOT NULL DEFAULT 'pending'      -- pending | approved | rejected
);

ALTER TABLE public.drivers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_requests ENABLE ROW LEVEL SECURITY;

-- Políticas para drivers
DROP POLICY IF EXISTS "drivers: lectura pública de activos" ON public.drivers;
DROP POLICY IF EXISTS "drivers: superadmin inserta"         ON public.drivers;
DROP POLICY IF EXISTS "drivers: superadmin edita"           ON public.drivers;
DROP POLICY IF EXISTS "drivers: superadmin borra"           ON public.drivers;
CREATE POLICY "drivers: lectura pública de activos" ON public.drivers FOR SELECT USING (status = 'activo' OR public.is_superadmin());
CREATE POLICY "drivers: superadmin inserta"         ON public.drivers FOR INSERT WITH CHECK (public.is_superadmin());
CREATE POLICY "drivers: superadmin edita"           ON public.drivers FOR UPDATE  USING (public.is_superadmin());
CREATE POLICY "drivers: superadmin borra"           ON public.drivers FOR DELETE  USING (public.is_superadmin());

-- Políticas para driver_requests
DROP POLICY IF EXISTS "driver_requests: insert público"         ON public.driver_requests;
DROP POLICY IF EXISTS "driver_requests: solo superadmin lee"    ON public.driver_requests;
DROP POLICY IF EXISTS "driver_requests: solo superadmin edita"  ON public.driver_requests;
DROP POLICY IF EXISTS "driver_requests: solo superadmin borra"  ON public.driver_requests;
CREATE POLICY "driver_requests: insert público"         ON public.driver_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "driver_requests: solo superadmin lee"    ON public.driver_requests FOR SELECT USING (public.is_superadmin());
CREATE POLICY "driver_requests: solo superadmin edita"  ON public.driver_requests FOR UPDATE  USING (public.is_superadmin());
CREATE POLICY "driver_requests: solo superadmin borra"  ON public.driver_requests FOR DELETE  USING (public.is_superadmin());

-- Migración: campo horario y fotos en postulaciones de chofer
ALTER TABLE public.driver_requests ADD COLUMN IF NOT EXISTS horario TEXT;
ALTER TABLE public.driver_requests ADD COLUMN IF NOT EXISTS foto_perfil TEXT;
ALTER TABLE public.driver_requests ADD COLUMN IF NOT EXISTS foto_vehiculo TEXT;

-- Migración: campo DNI para verificación de identidad (choferes y postulaciones)
ALTER TABLE public.driver_requests ADD COLUMN IF NOT EXISTS dni TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS dni TEXT;

-- ============================================================
-- MÓDULOS POR TIENDA (POS, inventario) + VENDEDORES DEL POS
-- ============================================================
-- `modulos` lo prende/apaga el superadmin por tienda ({"pos": true, "inventario": true}).
-- NULL = tienda anterior a los módulos: el panel deja todo prendido.
-- `vendedores` es el equipo que aparece en la caja POS de cada negocio.
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS modulos JSONB;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS vendedores TEXT[];

-- Las tiendas que ya existían conservan lo que tenían (POS e inventario prendidos).
-- El superadmin puede apagarlos desde el editor de tienda.
UPDATE public.stores SET modulos = '{"pos": true, "inventario": true}'::jsonb WHERE modulos IS NULL;

-- La política UPDATE de stores deja al dueño editar su tienda: sin esto podría
-- activarse módulos él mismo. Mismo patrón que profiles_protege_rol.
CREATE OR REPLACE FUNCTION public.stores_protege_modulos()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo frena a usuarios de la app que no son superadmin. El editor SQL de Supabase y el
  -- service_role no son "usuarios" (no traen sesión) y sí pueden cambiarlo.
  IF NEW.modulos IS DISTINCT FROM OLD.modulos
     AND NOT public.is_superadmin()
     AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    NEW.modulos := OLD.modulos;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stores_protege_modulos ON public.stores;
CREATE TRIGGER stores_protege_modulos
BEFORE UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.stores_protege_modulos();

-- ============================================================
-- PRODUCTOS DE EJEMPLO: APAGADOS POR DEFECTO
-- ============================================================
-- Antes una tienda vacía mostraba los productos demo de su plantilla sola. Ahora solo salen
-- si el superadmin o el dueño lo prende (interruptor "mostrar productos de ejemplo").
-- Las tiendas que ya tienen productos propios no cambian: los demo nunca se muestran encima.
ALTER TABLE public.stores ALTER COLUMN show_demo_products SET DEFAULT false;
UPDATE public.stores SET show_demo_products = false WHERE show_demo_products IS DISTINCT FROM false;

-- ============================================================
-- MÓDULO GOOGLE (feed de Merchant Center): solo salen las tiendas que lo tengan prendido
-- ============================================================
-- Antes /api/google-feed incluía todas las tiendas. Para no cortar de golpe a las que ya estaban,
-- las actuales conservan su lugar; el superadmin apaga ahí a las que no paguen. Las tiendas nuevas
-- arrancan sin Google.
UPDATE public.stores
   SET modulos = COALESCE(modulos, '{}'::jsonb) || '{"google": true}'::jsonb
 WHERE NOT (COALESCE(modulos, '{}'::jsonb) ? 'google');

-- ============================================================
-- HISTORIAL DE STOCK
-- ============================================================
-- Cada vez que el stock sube o baja (venta en caja, pedido de la carta, cancelación, ingreso de
-- mercadería, ajuste a mano) queda una fila. Solo se agrega: no se edita ni se borra.
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  store TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  delta INTEGER NOT NULL,
  stock_despues INTEGER NOT NULL,
  motivo TEXT NOT NULL,
  pedido_id UUID,
  usuario TEXT
);
CREATE INDEX IF NOT EXISTS stock_movements_store_idx ON public.stock_movements (store, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_movements_pedido_idx ON public.stock_movements (pedido_id);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_movements: dueño o superadmin ve"   ON public.stock_movements;
DROP POLICY IF EXISTS "stock_movements: dueño o superadmin crea" ON public.stock_movements;
CREATE POLICY "stock_movements: dueño o superadmin ve"
ON public.stock_movements FOR SELECT
USING (
  public.is_superadmin()
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.slug = stock_movements.store AND s.user_id = auth.uid())
);
CREATE POLICY "stock_movements: dueño o superadmin crea"
ON public.stock_movements FOR INSERT
WITH CHECK (
  public.is_superadmin()
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.slug = stock_movements.store AND s.user_id = auth.uid())
);

-- ============================================================
-- COBROS: precios por nivel, suscripción de cada tienda y pagos recibidos
-- ============================================================
-- Se cobra por Yape / transferencia / efectivo: el superadmin registra cada pago y el vencimiento.
-- (Ver /superadmin/cobros.) Los precios son públicos (el dueño ve cuánto paga); el resto, solo el
-- superadmin y el dueño de la tienda en lo suyo.
CREATE TABLE IF NOT EXISTS public.plan_precios (
  clave TEXT PRIMARY KEY,
  monto NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_suscripciones (
  store TEXT PRIMARY KEY REFERENCES public.stores(slug) ON UPDATE CASCADE ON DELETE CASCADE,
  monto_mensual NUMERIC,
  vence DATE,
  notas TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_pagos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store TEXT NOT NULL REFERENCES public.stores(slug) ON UPDATE CASCADE ON DELETE CASCADE,
  monto NUMERIC NOT NULL,
  metodo TEXT,
  referencia TEXT,
  meses INTEGER NOT NULL DEFAULT 1,
  vence_antes DATE,
  vence_despues DATE,
  nota TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS store_pagos_store_idx ON public.store_pagos (store, created_at DESC);

ALTER TABLE public.plan_precios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_suscripciones  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_pagos          ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_precios: lectura pública"      ON public.plan_precios;
DROP POLICY IF EXISTS "plan_precios: superadmin escribe"   ON public.plan_precios;
CREATE POLICY "plan_precios: lectura pública"    ON public.plan_precios FOR SELECT USING (true);
CREATE POLICY "plan_precios: superadmin escribe" ON public.plan_precios FOR ALL USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "store_suscripciones: dueño o superadmin ve" ON public.store_suscripciones;
DROP POLICY IF EXISTS "store_suscripciones: superadmin escribe"    ON public.store_suscripciones;
CREATE POLICY "store_suscripciones: dueño o superadmin ve"
ON public.store_suscripciones FOR SELECT
USING (
  public.is_superadmin()
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.slug = store_suscripciones.store AND s.user_id = auth.uid())
);
CREATE POLICY "store_suscripciones: superadmin escribe" ON public.store_suscripciones FOR ALL USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "store_pagos: dueño o superadmin ve" ON public.store_pagos;
DROP POLICY IF EXISTS "store_pagos: superadmin escribe"    ON public.store_pagos;
CREATE POLICY "store_pagos: dueño o superadmin ve"
ON public.store_pagos FOR SELECT
USING (
  public.is_superadmin()
  OR EXISTS (SELECT 1 FROM public.stores s WHERE s.slug = store_pagos.store AND s.user_id = auth.uid())
);
CREATE POLICY "store_pagos: superadmin escribe" ON public.store_pagos FOR ALL USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

-- En la base products.id es texto (UUID en casi todos, números en los de Delva): el historial también.
ALTER TABLE public.stock_movements ALTER COLUMN product_id TYPE TEXT USING product_id::text;

-- ============================================================
-- HORARIO SEMANAL DE LOS CHOFERES (Taxi Seguro / Transporte)
-- ============================================================
-- {"lun":[{"desde":"06:00","hasta":"21:00"}], ...}  Ver src/lib/horario.ts.
-- Con esto el directorio muestra solo quién está disponible ahora (hora de Perú).
ALTER TABLE public.driver_requests ADD COLUMN IF NOT EXISTS horario_semana JSONB;
ALTER TABLE public.drivers         ADD COLUMN IF NOT EXISTS horario_semana JSONB;
