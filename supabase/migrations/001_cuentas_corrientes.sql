-- Tabla de perfiles (si no existe ya)
-- Los perfiles se crean automáticamente via trigger al registrarse un usuario en auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  dni TEXT NOT NULL UNIQUE,
  nombre TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de cuentas corrientes
CREATE TABLE IF NOT EXISTS cuentas_corrientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  usuario_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  saldo NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- El UUID menor siempre va en usuario_a_id
  CONSTRAINT chk_orden_ids CHECK (usuario_a_id < usuario_b_id),
  CONSTRAINT uq_par_usuarios UNIQUE (usuario_a_id, usuario_b_id)
);

CREATE INDEX IF NOT EXISTS idx_cc_usuario_a ON cuentas_corrientes(usuario_a_id);
CREATE INDEX IF NOT EXISTS idx_cc_usuario_b ON cuentas_corrientes(usuario_b_id);

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, dni)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'dni', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger para auto-update de updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON cuentas_corrientes;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON cuentas_corrientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas_corrientes ENABLE ROW LEVEL SECURITY;

-- service_role bypasses RLS, so these policies are for anon/authenticated clients
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view their cuentas" ON cuentas_corrientes
  FOR SELECT USING (auth.uid() = usuario_a_id OR auth.uid() = usuario_b_id);

CREATE POLICY "Users can create cuentas" ON cuentas_corrientes
  FOR INSERT WITH CHECK (auth.uid() = usuario_a_id OR auth.uid() = usuario_b_id);
