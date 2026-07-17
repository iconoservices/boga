-- Supabase SQL script to create the 'orders' table
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store VARCHAR NOT NULL,
  customer_name VARCHAR NOT NULL,
  customer_phone VARCHAR,
  customer_address VARCHAR,
  items JSONB NOT NULL,
  total_amount NUMERIC NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'Pendiente', -- Pendiente, Preparando, Listo, Entregado, Cancelado
  payment_method VARCHAR, -- Efectivo, Yape, Plin, Tarjeta (ventas POS)
  seller_name VARCHAR, -- Vendedor que registró la venta (ventas POS)
  order_source VARCHAR DEFAULT 'App', -- App, POS, WhatsApp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migración: si la tabla ya existía, agregar las columnas del POS
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_name VARCHAR;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_source VARCHAR DEFAULT 'App';

-- Habilitar RLS (Row Level Security) para mayor seguridad
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Políticas temporales para permitir lectura/escritura a todos (Ajustar en producción)
CREATE POLICY "Permitir insertar pedidos a todos" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir leer pedidos a todos" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Permitir actualizar pedidos a todos" ON public.orders FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminar pedidos a todos" ON public.orders FOR DELETE USING (true);
