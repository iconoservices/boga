-- Módulo «Cobros mensuales» (stores.modulos.cobros_mensuales): el negocio lleva a quién le cobra cada mes.
-- Ejecutar una vez en el SQL Editor de Supabase. No toca nada existente.
--
--  · cobros_clientes: a quién se le cobra (nombre, WhatsApp, concepto, monto) y hasta cuándo está pagado (`vence`).
--  · cobros_pagos:    cada pago registrado (historial); al marcar «Cobrado» se suma un mes a `vence`.
-- Solo el dueño, los co-administradores de la tienda y el superadmin ven y escriben (RLS).

CREATE TABLE IF NOT EXISTS public.cobros_clientes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store      TEXT NOT NULL,
  nombre     TEXT NOT NULL,
  whatsapp   TEXT,
  concepto   TEXT,
  monto      NUMERIC NOT NULL DEFAULT 0,
  vence      DATE,
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  notas      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cobros_clientes_store_idx ON public.cobros_clientes (store, vence);

CREATE TABLE IF NOT EXISTS public.cobros_pagos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id    UUID NOT NULL REFERENCES public.cobros_clientes(id) ON DELETE CASCADE,
  store         TEXT NOT NULL,
  monto         NUMERIC NOT NULL,
  meses         INTEGER NOT NULL DEFAULT 1,
  vence_despues DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cobros_pagos_cliente_idx ON public.cobros_pagos (cliente_id, created_at DESC);

ALTER TABLE public.cobros_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobros_pagos    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cobros_clientes: admin de la tienda" ON public.cobros_clientes;
CREATE POLICY "cobros_clientes: admin de la tienda" ON public.cobros_clientes
  FOR ALL USING (public.is_superadmin() OR public.es_admin_de(store))
  WITH CHECK (public.is_superadmin() OR public.es_admin_de(store));

DROP POLICY IF EXISTS "cobros_pagos: admin de la tienda" ON public.cobros_pagos;
CREATE POLICY "cobros_pagos: admin de la tienda" ON public.cobros_pagos
  FOR ALL USING (public.is_superadmin() OR public.es_admin_de(store))
  WITH CHECK (public.is_superadmin() OR public.es_admin_de(store));
