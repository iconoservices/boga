-- Create the store_requests table (solicitudes de negocios para unirse a Boga Market)
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

-- Set up Row Level Security (RLS)
ALTER TABLE public.store_requests ENABLE ROW LEVEL SECURITY;

-- Allow public insert (el formulario público de registro no requiere login)
CREATE POLICY "Permitir insertar solicitudes a todos"
ON public.store_requests FOR INSERT
WITH CHECK ( true );

-- Allow public read (el superadmin lee la lista de solicitudes sin auth propio en esta app)
CREATE POLICY "Permitir leer solicitudes a todos"
ON public.store_requests FOR SELECT
USING ( true );

-- Allow public update (aprobar/rechazar desde el superadmin)
CREATE POLICY "Permitir actualizar solicitudes a todos"
ON public.store_requests FOR UPDATE
USING ( true );

-- Create an index on status for faster lookups del panel de superadmin
CREATE INDEX IF NOT EXISTS store_requests_status_idx ON public.store_requests (status);
