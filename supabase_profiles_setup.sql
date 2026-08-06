-- Perfiles de usuario (id + email), para que /superadmin pueda listar quién
-- tiene cuenta real sin necesitar la service_role key (esa nunca debe vivir
-- en el navegador). Se llena solo: un trigger copia cada alta de auth.users.
--
-- Es 100% repetible: se puede correr las veces que haga falta.

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Cada quien ve su propio perfil; el superadmin los ve todos (los necesita
-- para armar la lista de "Usuarios" en /superadmin).
DROP POLICY IF EXISTS "Cada quien ve su perfil, superadmin ve todos" ON public.profiles;
CREATE POLICY "Cada quien ve su perfil, superadmin ve todos"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id
  OR auth.jwt() ->> 'email' = 'jnmcsky@gmail.com'
);

DROP POLICY IF EXISTS "Cada usuario actualiza su propio perfil" ON public.profiles;
CREATE POLICY "Cada usuario actualiza su propio perfil"
ON public.profiles FOR UPDATE
USING (
  auth.uid() = id
  OR auth.jwt() ->> 'email' = 'jnmcsky@gmail.com'
);

-- Trigger: cuando alguien se registra (signUp o el link de invitación por
-- correo, que tambien crea la cuenta), se crea su fila en profiles solo.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: cuentas que ya existian antes de este trigger (como la tuya).
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;
