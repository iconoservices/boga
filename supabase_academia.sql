-- ─────────────────────────────────────────────────────────────────────────────
-- ACADEMIAS: alumnos con carnet QR y asistencia (módulo `modulos.academia`).
-- · alumnos: cada alumno tiene un `token` secreto; es el QR del carnet y el enlace privado del padre
--   (/academia/alumno/<token>), sin login.
-- · asistencias: una por alumno por día (hora de Lima). La escribe el servidor al escanear el QR.
-- · academia_config: PIN del profesor para escanear sin entrar al panel del dueño.
-- · alumno_push: celulares de los padres que aceptaron el aviso "tu hijo llegó" (suscripción en push_subs).
-- Todo se lee y escribe por el panel del dueño (RLS) o por el servidor (llave de servicio).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.alumnos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  store       TEXT NOT NULL,
  nombre      TEXT NOT NULL,
  grupo       TEXT,
  telefono    TEXT,                           -- celular del padre (9 dígitos)
  token       TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  activo      BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS alumnos_store_idx ON public.alumnos (store);

CREATE TABLE IF NOT EXISTS public.asistencias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id   UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  store       TEXT NOT NULL,
  fecha       DATE NOT NULL,                  -- día en hora de Lima
  llegada_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (alumno_id, fecha)
);
CREATE INDEX IF NOT EXISTS asistencias_store_fecha_idx ON public.asistencias (store, fecha);

CREATE TABLE IF NOT EXISTS public.academia_config (
  store       TEXT PRIMARY KEY,
  pin         TEXT
);

CREATE TABLE IF NOT EXISTS public.alumno_push (
  alumno_id   UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL REFERENCES public.push_subs(endpoint) ON DELETE CASCADE,
  PRIMARY KEY (alumno_id, endpoint)
);

ALTER TABLE public.alumnos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academia_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumno_push      ENABLE ROW LEVEL SECURITY;  -- sin políticas: solo el servidor

DROP POLICY IF EXISTS "alumnos: dueño o superadmin" ON public.alumnos;
CREATE POLICY "alumnos: dueño o superadmin" ON public.alumnos FOR ALL
USING (public.is_superadmin() OR public.es_admin_de(store))
WITH CHECK (public.is_superadmin() OR public.es_admin_de(store));

DROP POLICY IF EXISTS "asistencias: dueño o superadmin" ON public.asistencias;
CREATE POLICY "asistencias: dueño o superadmin" ON public.asistencias FOR ALL
USING (public.is_superadmin() OR public.es_admin_de(store))
WITH CHECK (public.is_superadmin() OR public.es_admin_de(store));

DROP POLICY IF EXISTS "academia_config: dueño o superadmin" ON public.academia_config;
CREATE POLICY "academia_config: dueño o superadmin" ON public.academia_config FOR ALL
USING (public.is_superadmin() OR public.es_admin_de(store))
WITH CHECK (public.is_superadmin() OR public.es_admin_de(store));
-- El módulo se prende por tienda desde el superadmin (Módulos → «Academia: alumnos y asistencia con QR»).
