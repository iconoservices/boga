-- LOTES DE COMPRA (cuántas unidades quedan de cada precio de compra). Pegar y correr COMPLETO en Supabase → SQL Editor (se puede correr varias veces).
-- Cada ingreso de mercadería crea un lote (cantidad + costo); las ventas descuentan del lote más antiguo (FIFO).
-- Requiere antes supabase_costo.sql (products.costo). El stock real sigue siendo products.stock.
CREATE TABLE IF NOT EXISTS public.stock_lotes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store             TEXT NOT NULL,
  product_id        UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  cantidad_inicial  INTEGER NOT NULL CHECK (cantidad_inicial > 0),
  cantidad_restante INTEGER NOT NULL CHECK (cantidad_restante >= 0),
  costo             NUMERIC(10,2) CHECK (costo IS NULL OR costo >= 0),
  origen            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stock_lotes_producto_idx ON public.stock_lotes (product_id, created_at);
CREATE INDEX IF NOT EXISTS stock_lotes_store_idx ON public.stock_lotes (store);

ALTER TABLE public.stock_lotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stock_lotes: ve"     ON public.stock_lotes;
DROP POLICY IF EXISTS "stock_lotes: anota"  ON public.stock_lotes;
DROP POLICY IF EXISTS "stock_lotes: edita"  ON public.stock_lotes;
CREATE POLICY "stock_lotes: ve" ON public.stock_lotes FOR SELECT
  USING (public.is_superadmin() OR public.es_admin_de(store));
CREATE POLICY "stock_lotes: anota" ON public.stock_lotes FOR INSERT
  WITH CHECK (public.is_superadmin() OR public.es_admin_de(store));
CREATE POLICY "stock_lotes: edita" ON public.stock_lotes FOR UPDATE
  USING (public.is_superadmin() OR public.es_admin_de(store))
  WITH CHECK (public.is_superadmin() OR public.es_admin_de(store));
