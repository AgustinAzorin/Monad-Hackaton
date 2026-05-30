-- =============================================================
-- 1. Tabla de transacciones
-- =============================================================
CREATE TABLE IF NOT EXISTS transacciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_corriente_id UUID NOT NULL REFERENCES cuentas_corrientes(id) ON DELETE CASCADE,
  monto NUMERIC(18,2) NOT NULL CHECK (monto > 0),
  tipo TEXT NOT NULL CHECK (tipo IN ('PAGO', 'FACTURA')),
  estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'COMPLETADO')),
  emisor_id UUID NOT NULL REFERENCES profiles(id),
  receptor_id UUID NOT NULL REFERENCES profiles(id),
  url_factura TEXT,
  descripcion TEXT,
  mercado_pago_preference_id TEXT,
  mercado_pago_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_emisor_receptor CHECK (emisor_id <> receptor_id)
);

CREATE INDEX idx_tx_cuenta ON transacciones(cuenta_corriente_id);
CREATE INDEX idx_tx_emisor ON transacciones(emisor_id);
CREATE INDEX idx_tx_receptor ON transacciones(receptor_id);
CREATE INDEX idx_tx_estado ON transacciones(estado);

DROP TRIGGER IF EXISTS set_updated_at_tx ON transacciones;
CREATE TRIGGER set_updated_at_tx
  BEFORE UPDATE ON transacciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- 2. Tabla de mensajes de chat (E2EE)
-- =============================================================
CREATE TABLE IF NOT EXISTS mensajes_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_corriente_id UUID NOT NULL REFERENCES cuentas_corrientes(id) ON DELETE CASCADE,
  remitente_id UUID NOT NULL REFERENCES profiles(id),
  texto_encriptado TEXT NOT NULL,
  iv TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_msg_cuenta ON mensajes_chat(cuenta_corriente_id);
CREATE INDEX idx_msg_created ON mensajes_chat(created_at);

-- =============================================================
-- 3. Tabla de claves públicas para E2EE (ECDH)
-- =============================================================
CREATE TABLE IF NOT EXISTS claves_publicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_corriente_id UUID NOT NULL REFERENCES cuentas_corrientes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES profiles(id),
  clave_publica TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_clave_por_cuenta UNIQUE (cuenta_corriente_id, usuario_id)
);

-- =============================================================
-- 4. RLS Policies
-- =============================================================
ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE claves_publicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transactions of their cuentas" ON transacciones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cuentas_corrientes cc
      WHERE cc.id = cuenta_corriente_id
        AND (cc.usuario_a_id = auth.uid() OR cc.usuario_b_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert transactions in their cuentas" ON transacciones
  FOR INSERT WITH CHECK (
    emisor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM cuentas_corrientes cc
      WHERE cc.id = cuenta_corriente_id
        AND (cc.usuario_a_id = auth.uid() OR cc.usuario_b_id = auth.uid())
    )
  );

CREATE POLICY "Users can view messages of their cuentas" ON mensajes_chat
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cuentas_corrientes cc
      WHERE cc.id = cuenta_corriente_id
        AND (cc.usuario_a_id = auth.uid() OR cc.usuario_b_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in their cuentas" ON mensajes_chat
  FOR INSERT WITH CHECK (
    remitente_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM cuentas_corrientes cc
      WHERE cc.id = cuenta_corriente_id
        AND (cc.usuario_a_id = auth.uid() OR cc.usuario_b_id = auth.uid())
    )
  );

CREATE POLICY "Users can view public keys of their cuentas" ON claves_publicas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cuentas_corrientes cc
      WHERE cc.id = cuenta_corriente_id
        AND (cc.usuario_a_id = auth.uid() OR cc.usuario_b_id = auth.uid())
    )
  );

CREATE POLICY "Users can upsert own public key" ON claves_publicas
  FOR INSERT WITH CHECK (
    usuario_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM cuentas_corrientes cc
      WHERE cc.id = cuenta_corriente_id
        AND (cc.usuario_a_id = auth.uid() OR cc.usuario_b_id = auth.uid())
    )
  );

-- Enable Supabase Realtime on mensajes_chat
ALTER PUBLICATION supabase_realtime ADD TABLE mensajes_chat;
