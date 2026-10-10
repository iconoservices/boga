-- Seguridad (10 oct 2026): plan protegido + frenos anti-spam compartidos. Pegar y correr COMPLETO en Supabase → SQL Editor.
-- Es lo mismo que quedó en supabase_setup.sql (se puede correr varias veces sin problema).

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS plan TEXT;   -- por si todavía no se corrió esa parte

CREATE OR REPLACE FUNCTION public.stores_protege_modulos()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo frena a usuarios de la app que no son superadmin. El editor SQL de Supabase y el
  -- service_role no son "usuarios" (no traen sesión) y sí pueden cambiarlo.
  IF NOT public.is_superadmin()
     AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    IF NEW.modulos IS DISTINCT FROM OLD.modulos THEN
      NEW.modulos := OLD.modulos;
    END IF;
    IF NEW.push_creditos IS DISTINCT FROM OLD.push_creditos THEN
      NEW.push_creditos := OLD.push_creditos;
    END IF;
    IF NEW.push_cupo_mes IS DISTINCT FROM OLD.push_cupo_mes THEN
      NEW.push_cupo_mes := OLD.push_cupo_mes;
    END IF;
    -- Servicios de pago: el subdominio propio (su app instalable con su logo) y los avisos push los prende solo el superadmin.
    IF NEW.subdominio_activo IS DISTINCT FROM OLD.subdominio_activo THEN
      NEW.subdominio_activo := OLD.subdominio_activo;
    END IF;
    IF NEW.push_activo IS DISTINCT FROM OLD.push_activo THEN
      NEW.push_activo := OLD.push_activo;
    END IF;
    -- El plan contratado fija el tope de productos (limite_productos_plan): sin esto el dueño podía
    -- ponerse 'multisede' desde la consola del navegador y quedar sin tope.
    IF NEW.plan IS DISTINCT FROM OLD.plan THEN
      NEW.plan := OLD.plan;
    END IF;
    -- Quién es el dueño (stores.user_id) de una tienda YA reclamada lo cambia solo el superadmin:
    -- sin esto, un co-administrador (ver store_admins) podría ponerse a sí mismo como dueño al
    -- guardar. Ojo: no frena "reclamar mi tienda" (OLD.user_id NULL -> el propio usuario), la
    -- política RLS de stores ya exige ahí que sea auth.uid() = user_id.
    IF OLD.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      NEW.user_id := OLD.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stores_protege_modulos ON public.stores;
CREATE TRIGGER stores_protege_modulos
BEFORE UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.stores_protege_modulos();

-- ============================================================
-- FRENOS anti-spam / anti-adivinar PIN, compartidos entre todas las instancias del servidor (lib/frenos.ts).
-- Antes vivían en la memoria de cada instancia de Vercel y alguien insistente se los saltaba.
-- La tabla y la función solo las usa el servidor (llave de servicio): sin políticas ni permisos para el navegador.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.frenos (
  clave TEXT PRIMARY KEY,
  n     INTEGER NOT NULL,
  desde TIMESTAMPTZ NOT NULL
);
ALTER TABLE public.frenos ENABLE ROW LEVEL SECURITY;   -- sin políticas a propósito

-- Suma un intento a la clave y devuelve true si ya pasó de p_max en la ventana. Con p_sumar = false solo mira.
CREATE OR REPLACE FUNCTION public.frenar(p_clave TEXT, p_max INTEGER, p_ventana_seg INTEGER, p_sumar BOOLEAN DEFAULT true)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_n INTEGER;
  v_limite TIMESTAMPTZ := now() - make_interval(secs => p_ventana_seg);
BEGIN
  IF NOT p_sumar THEN
    SELECT n INTO v_n FROM public.frenos WHERE clave = p_clave AND desde >= v_limite;
    RETURN COALESCE(v_n, 0) >= p_max;
  END IF;

  INSERT INTO public.frenos AS f (clave, n, desde) VALUES (p_clave, 1, now())
  ON CONFLICT (clave) DO UPDATE SET
    n     = CASE WHEN f.desde < v_limite THEN 1 ELSE f.n + 1 END,
    desde = CASE WHEN f.desde < v_limite THEN now() ELSE f.desde END
  RETURNING n INTO v_n;

  -- Limpieza de vez en cuando (claves de más de un día)
  IF random() < 0.01 THEN
    DELETE FROM public.frenos WHERE desde < now() - interval '1 day';
  END IF;

  RETURN v_n > p_max;
END $$;

REVOKE ALL ON FUNCTION public.frenar(TEXT, INTEGER, INTEGER, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.frenar(TEXT, INTEGER, INTEGER, BOOLEAN) TO service_role;
