-- ACADEMIAS · parte 2: los padres entran con su cuenta (no con el celular).
-- Correr DESPUÉS de supabase_academia.sql. Es seguro correrlo más de una vez.
--  · alumnos.email_padre: si el dueño anota el correo del padre, sus hijos le aparecen solos al iniciar sesión con ese correo.
--  · alumnos.codigo: código corto (6 letras/números) para que un padre vincule a su hijo desde la app si el correo no coincide.
--  · alumno_padres: qué cuentas están vinculadas a qué alumno (solo la lee y escribe el servidor).

ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS email_padre TEXT;
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS codigo TEXT NOT NULL DEFAULT upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
CREATE UNIQUE INDEX IF NOT EXISTS alumnos_codigo_idx ON public.alumnos (store, codigo);
CREATE INDEX IF NOT EXISTS alumnos_email_idx ON public.alumnos (store, lower(email_padre));

CREATE TABLE IF NOT EXISTS public.alumno_padres (
  alumno_id   UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (alumno_id, user_id)
);
ALTER TABLE public.alumno_padres ENABLE ROW LEVEL SECURITY;  -- sin políticas: solo el servidor
