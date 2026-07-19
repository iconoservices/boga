-- Create the stores table
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
    theme JSONB DEFAULT '{}'::jsonb,
    categories JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active'
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all stores
CREATE POLICY "Permitir leer tiendas a todos"
ON public.stores FOR SELECT
USING ( true );

-- Allow public insert
CREATE POLICY "Permitir insertar tiendas a todos"
ON public.stores FOR INSERT
WITH CHECK ( true );

-- Allow public update
CREATE POLICY "Permitir actualizar tiendas a todos"
ON public.stores FOR UPDATE
USING ( true );

-- Allow public delete
CREATE POLICY "Permitir eliminar tiendas a todos"
ON public.stores FOR DELETE
USING ( true );

-- Create an index on the slug for faster lookups
CREATE INDEX IF NOT EXISTS stores_slug_idx ON public.stores (slug);

-- Migration: Add logo_image column (run this if the table already exists)
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS logo_image TEXT;

-- Migration: Add show_demo_products column (run this if the table already exists)
-- Controla si la tienda muestra los productos de ejemplo de su plantilla
-- MIENTRAS esta vacia. Si ya cargo productos propios, no se muestran nunca,
-- tenga esta columna el valor que tenga (ver src/lib/demo.ts).
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS show_demo_products BOOLEAN DEFAULT true;

-- Migration: Add whatsapp column (run this if the table already exists)
-- Sin esta columna el admin no puede guardar NINGUNA tienda: handleStoreSave
-- manda `whatsapp` en el upsert y PostgREST rechaza el write completo.
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Create the 'store-assets' bucket for logos and hero images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the 'store-assets' bucket
CREATE POLICY "Permitir lectura publica de assets de tienda"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-assets');

CREATE POLICY "Permitir subir assets de tienda a todos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'store-assets');

CREATE POLICY "Permitir editar assets de tienda a todos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'store-assets');

CREATE POLICY "Permitir borrar assets de tienda a todos"
ON storage.objects FOR DELETE
USING (bucket_id = 'store-assets');

