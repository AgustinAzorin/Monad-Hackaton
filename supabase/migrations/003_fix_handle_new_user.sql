-- =============================================================
-- FIX: el registro de usuarios fallaba con
--   "Database error creating new user" y, por lo tanto, el login
--   devolvia "Credenciales invalidas" (el usuario nunca se creaba).
--
-- Causa: la migracion 001_cuentas_corrientes.sql redefinio
--   public.handle_new_user() con `CREATE OR REPLACE` PERO sin
--   `SET search_path` y con `INSERT INTO profiles` sin calificar el
--   esquema. El trigger corre bajo el rol `supabase_auth_admin`,
--   cuyo search_path es `auth`, por lo que `profiles` se resolvia
--   como `auth.profiles` (inexistente) y la insercion abortaba la
--   creacion del usuario en auth.users.
--
-- Solucion: volver a fijar search_path = public y calificar la tabla.
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, dni, email)
  VALUES (
    NEW.id,
    -- dni es NOT NULL UNIQUE: si faltara en el metadata usamos el id
    -- (siempre unico) para no abortar la creacion del usuario.
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'dni', ''), NEW.id::text),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Aseguramos que el trigger exista y apunte a la funcion corregida.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
