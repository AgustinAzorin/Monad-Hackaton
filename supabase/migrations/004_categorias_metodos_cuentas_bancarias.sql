-- =============================================================
-- 1. Catálogo de categorías
-- =============================================================
CREATE TABLE IF NOT EXISTS categorias (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL UNIQUE,
  slug       TEXT NOT NULL UNIQUE,
  icono      TEXT NOT NULL DEFAULT 'FolderKanban',
  color      TEXT NOT NULL DEFAULT 'bg-primary',
  orden      INT  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO categorias (nombre, slug, icono, color, orden) VALUES
  ('Proveedores', 'proveedores', 'Building2',    'bg-chart-1', 1),
  ('Ventas',      'ventas',      'TrendingUp',   'bg-chart-2', 2),
  ('Logística',   'logistica',   'Truck',        'bg-chart-3', 3),
  ('Servicios',   'servicios',   'Wallet',       'bg-chart-4', 4),
  ('Compras',     'compras',     'ShoppingCart', 'bg-chart-5', 5),
  ('Salarios',    'salarios',    'Users',        'bg-primary', 6),
  ('Impuestos',   'impuestos',   'Receipt',      'bg-chart-3', 7),
  ('Otros',       'otros',       'FolderKanban', 'bg-muted',   8)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================
-- 2. Catálogo de métodos de pago
-- =============================================================
CREATE TABLE IF NOT EXISTS metodos_pago (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL UNIQUE,
  slug       TEXT NOT NULL UNIQUE,
  orden      INT  NOT NULL DEFAULT 0,
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO metodos_pago (nombre, slug, orden) VALUES
  ('Transferencia bancaria', 'transferencia_bancaria', 1),
  ('Deposito bancario',      'deposito_bancario',      2),
  ('Efectivo',               'efectivo',               3),
  ('Cheque',                 'cheque',                 4),
  ('Debito automatico',      'debito_automatico',      5),
  ('Tarjeta de credito',     'tarjeta_credito',        6),
  ('Mercado Pago',           'mercado_pago',           7)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================
-- 3. Categoría y método de pago en transacciones
--    (referencian el slug del catálogo; NULL = sin clasificar)
-- =============================================================
ALTER TABLE transacciones
  ADD COLUMN IF NOT EXISTS categoria_slug   TEXT,
  ADD COLUMN IF NOT EXISTS metodo_pago_slug TEXT;

CREATE INDEX IF NOT EXISTS idx_tx_categoria ON transacciones(categoria_slug);

-- =============================================================
-- 4. Cuentas / contactos con datos bancarios (agenda del usuario)
-- =============================================================
CREATE TABLE IF NOT EXISTS cuentas_bancarias (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL DEFAULT 'other'
                  CHECK (tipo IN ('client', 'supplier', 'employee', 'other')),
  nombre        TEXT NOT NULL,
  cuit          TEXT,
  condicion_iva TEXT,
  email         TEXT,
  telefono      TEXT,
  contacto      TEXT,
  direccion     TEXT,
  banco         TEXT,
  tipo_cuenta   TEXT,  -- 'cc' (cuenta corriente) | 'ca' (caja de ahorro)
  cbu           TEXT,
  alias         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cb_usuario ON cuentas_bancarias(usuario_id);

DROP TRIGGER IF EXISTS set_updated_at_cb ON cuentas_bancarias;
CREATE TRIGGER set_updated_at_cb
  BEFORE UPDATE ON cuentas_bancarias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- 5. RLS
-- =============================================================
ALTER TABLE categorias        ENABLE ROW LEVEL SECURITY;
ALTER TABLE metodos_pago      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas_bancarias ENABLE ROW LEVEL SECURITY;

-- Catálogos: lectura pública para usuarios autenticados (el backend usa
-- service_role y omite RLS, pero dejamos la política por consistencia).
CREATE POLICY "Catalogo categorias legible" ON categorias
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Catalogo metodos_pago legible" ON metodos_pago
  FOR SELECT USING (auth.role() = 'authenticated');

-- Cuentas bancarias: cada usuario sólo ve y gestiona las suyas.
CREATE POLICY "Users can view own bank accounts" ON cuentas_bancarias
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Users can insert own bank accounts" ON cuentas_bancarias
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update own bank accounts" ON cuentas_bancarias
  FOR UPDATE USING (auth.uid() = usuario_id);

CREATE POLICY "Users can delete own bank accounts" ON cuentas_bancarias
  FOR DELETE USING (auth.uid() = usuario_id);
