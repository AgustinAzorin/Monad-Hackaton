-- =============================================================
-- Integración Monad: wallet por usuario + estado on-chain en transacciones
-- =============================================================

-- 1. Wallet EVM vinculada al perfil (para verificar firmas EIP-712 on-chain)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_address TEXT;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_wallet_format;
ALTER TABLE profiles ADD CONSTRAINT chk_wallet_format
  CHECK (wallet_address IS NULL OR wallet_address ~ '^0x[0-9a-fA-F]{40}$');

-- Una wallet no puede estar vinculada a dos perfiles (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_wallet
  ON profiles (lower(wallet_address)) WHERE wallet_address IS NOT NULL;

-- 2. Columnas on-chain en transacciones (NO se toca `estado` existente: PENDIENTE|COMPLETADO)
ALTER TABLE transacciones ADD COLUMN IF NOT EXISTS factura_hash TEXT;   -- sha256 hex del PDF (#4)
ALTER TABLE transacciones ADD COLUMN IF NOT EXISTS anchor_tx_hash TEXT; -- hash de la tx de anclaje (#1)

ALTER TABLE transacciones DROP CONSTRAINT IF EXISTS chk_estado_onchain;
ALTER TABLE transacciones ADD COLUMN IF NOT EXISTS estado_onchain TEXT NOT NULL DEFAULT 'NO_ANCLADA';
ALTER TABLE transacciones ADD CONSTRAINT chk_estado_onchain
  CHECK (estado_onchain IN (
    'NO_ANCLADA', 'SIN_WALLET', 'REGISTRADA', 'CONFIRMADA',
    'PAGADA', 'REEMBOLSO_SOLICITADO', 'REEMBOLSADA', 'ERROR'
  ));

CREATE INDEX IF NOT EXISTS idx_tx_estado_onchain ON transacciones(estado_onchain);
