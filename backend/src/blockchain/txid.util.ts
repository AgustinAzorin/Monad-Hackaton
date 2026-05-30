/**
 * Convierte un UUID de Postgres (16 bytes / 32 hex) en un bytes32 determinístico
 * y reversible: hex sin guiones, right-padded con ceros a 32 bytes.
 *
 * Debe coincidir EXACTO con lo que firma el frontend (lib/eip712.ts) y con la
 * key que usa el contrato. No cambiar sin actualizar ambos lados.
 */
export function uuidToBytes32(uuid: string): `0x${string}` {
  const hex = uuid.replace(/-/g, '').toLowerCase();
  if (hex.length !== 32 || !/^[0-9a-f]{32}$/.test(hex)) {
    throw new Error(`UUID inválido para bytes32: ${uuid}`);
  }
  return `0x${hex}${'0'.repeat(32)}` as `0x${string}`;
}

/** Inverso de uuidToBytes32 (para mapear eventos on-chain de vuelta a filas). */
export function bytes32ToUuid(b32: string): string {
  const hex = b32.replace(/^0x/, '').toLowerCase().slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}
