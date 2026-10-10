-- ============================================================
-- CAJA CHICA del POS (10 oct 2026). Pegar y correr COMPLETO en Supabase → SQL Editor (se puede correr varias veces).
--  · caja_sesiones: cada apertura/cierre de caja de una tienda (con cuánto se abrió, cuánto debía haber y cuánto se contó).
--  · caja_movimientos: plata que entra o sale de la caja sin ser una venta (pagar al delivery, comprar hielo, sencillo…).
-- Las ventas en efectivo del POS no se copian acá: se suman desde `orders` (order_source 'POS') entre la apertura y el cierre.
-- Solo el dueño, sus co-administradores o el superadmin. Una caja cerrada ya no se puede editar.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.caja_sesiones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store         TEXT NOT NULL,
  abierta_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  abierta_por   TEXT,
  monto_inicial NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (monto_inicial >= 0),
  cerrada_at    TIMESTAMPTZ,
  cerrada_por   TEXT,
  esperado      NUMERIC(10,2),
  contado       NUMERIC(10,2),
  diferencia    NUMERIC(10,2),
  resumen       JSONB,          -- foto del cierre: ventas por método de pago, ingresos, egresos
  nota          TEXT
);
-- Una sola caja abierta por tienda a la vez
CREATE UNIQUE INDEX IF NOT EXISTS caja_sesiones_una_abierta ON public.caja_sesiones (store) WHERE cerrada_at IS NULL;
CREATE INDEX IF NOT EXISTS caja_sesiones_store_idx ON public.caja_sesiones (store, abierta_at DESC);

CREATE TABLE IF NOT EXISTS public.caja_movimientos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_id  UUID NOT NULL REFERENCES public.caja_sesiones(id) ON DELETE CASCADE,
  store      TEXT NOT NULL,
  tipo       TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  monto      NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  concepto   TEXT NOT NULL CHECK (length(concepto) BETWEEN 1 AND 120),
  usuario    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS caja_movimientos_sesion_idx ON public.caja_movimientos (sesion_id, created_at);

ALTER TABLE public.caja_sesiones    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_movimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "caja_sesiones: ve"      ON public.caja_sesiones;
DROP POLICY IF EXISTS "caja_sesiones: abre"    ON public.caja_sesiones;
DROP POLICY IF EXISTS "caja_sesiones: cierra"  ON public.caja_sesiones;
DROP POLICY IF EXISTS "caja_sesiones: borra"   ON public.caja_sesiones;
CREATE POLICY "caja_sesiones: ve" ON public.caja_sesiones FOR SELECT
  USING (public.is_superadmin() OR public.es_admin_de(store));
CREATE POLICY "caja_sesiones: abre" ON public.caja_sesiones FOR INSERT
  WITH CHECK ((public.is_superadmin() OR public.es_admin_de(store)) AND cerrada_at IS NULL);
-- Solo se toca mientras está abierta (para cerrarla); una caja cerrada queda como está.
CREATE POLICY "caja_sesiones: cierra" ON public.caja_sesiones FOR UPDATE
  USING ((public.is_superadmin() OR public.es_admin_de(store)) AND cerrada_at IS NULL)
  WITH CHECK (public.is_superadmin() OR public.es_admin_de(store));
CREATE POLICY "caja_sesiones: borra" ON public.caja_sesiones FOR DELETE
  USING (public.is_superadmin());

DROP POLICY IF EXISTS "caja_movimientos: ve"    ON public.caja_movimientos;
DROP POLICY IF EXISTS "caja_movimientos: anota" ON public.caja_movimientos;
DROP POLICY IF EXISTS "caja_movimientos: borra" ON public.caja_movimientos;
CREATE POLICY "caja_movimientos: ve" ON public.caja_movimientos FOR SELECT
  USING (public.is_superadmin() OR public.es_admin_de(store));
-- Solo en una caja ABIERTA de esa misma tienda
CREATE POLICY "caja_movimientos: anota" ON public.caja_movimientos FOR INSERT
  WITH CHECK (
    (public.is_superadmin() OR public.es_admin_de(store))
    AND EXISTS (SELECT 1 FROM public.caja_sesiones s WHERE s.id = sesion_id AND s.store = caja_movimientos.store AND s.cerrada_at IS NULL)
  );
-- Corregir un error: solo mientras la caja siga abierta
CREATE POLICY "caja_movimientos: borra" ON public.caja_movimientos FOR DELETE
  USING (
    (public.is_superadmin() OR public.es_admin_de(store))
    AND EXISTS (SELECT 1 FROM public.caja_sesiones s WHERE s.id = sesion_id AND s.cerrada_at IS NULL)
  );
