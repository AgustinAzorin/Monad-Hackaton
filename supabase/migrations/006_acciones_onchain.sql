-- =============================================================
-- Acciones co-firmadas (EIP-712) por ambas partes: confirmar/pagar/reembolsar
-- Una fila por intento de acción; recolecta las dos firmas y luego el backend
-- envía UNA tx on-chain (modelo gasless, backend submitter).
-- =============================================================
CREATE TABLE IF NOT EXISTS acciones_onchain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaccion_id UUID NOT NULL REFERENCES transacciones(id) ON DELETE CASCADE,
  tipo_accion TEXT NOT NULL CHECK (tipo_accion IN ('CONFIRMAR', 'PAGAR', 'REEMBOLSAR')),
  firma_emisor TEXT,
  firma_receptor TEXT,
  nonce NUMERIC(20,0) NOT NULL,
  deadline BIGINT NOT NULL,                 -- epoch en segundos
  estado TEXT NOT NULL DEFAULT 'PENDIENTE_FIRMAS'
    CHECK (estado IN ('PENDIENTE_FIRMAS', 'LISTA', 'ENVIADA', 'CONFIRMADA', 'FALLIDA')),
  tx_hash TEXT,
  error_msg TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Una acción viva por (transacción, tipo). Al re-intentar tras FALLIDA el backend
  -- borra la fila previa antes de insertar una nueva.
  CONSTRAINT uq_accion_viva UNIQUE (transaccion_id, tipo_accion)
);

CREATE INDEX IF NOT EXISTS idx_acc_tx ON acciones_onchain(transaccion_id);
CREATE INDEX IF NOT EXISTS idx_acc_estado ON acciones_onchain(estado);

DROP TRIGGER IF EXISTS set_updated_at_acc ON acciones_onchain;
CREATE TRIGGER set_updated_at_acc
  BEFORE UPDATE ON acciones_onchain
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- RLS: los participantes de la cuenta pueden ver las acciones de sus transacciones
-- (necesario para que el frontend reciba eventos de Realtime).
-- El backend usa service_role y bypassa RLS para escribir.
-- =============================================================
ALTER TABLE acciones_onchain ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view acciones of their cuentas" ON acciones_onchain
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM transacciones t
      JOIN cuentas_corrientes cc ON cc.id = t.cuenta_corriente_id
      WHERE t.id = transaccion_id
        AND (cc.usuario_a_id = auth.uid() OR cc.usuario_b_id = auth.uid())
    )
  );

-- Realtime para que la contraparte vea al instante una firma pendiente
ALTER PUBLICATION supabase_realtime ADD TABLE acciones_onchain;
