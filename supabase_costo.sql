-- Costo por unidad de cada producto (opcional, solo lo ve el dueño). Pegar y correr en Supabase → SQL Editor (se puede correr varias veces).
-- Con él, Métricas calcula la inversión en mercadería y la ganancia estimada.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS costo NUMERIC(10,2) CHECK (costo IS NULL OR costo >= 0);
