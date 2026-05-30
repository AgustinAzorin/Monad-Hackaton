import { useSignTypedData } from 'wagmi';
import { monadTestnet } from 'viem/chains';

// verifyingContract del dominio EIP-712 = dirección del CuentaCorrienteRegistry desplegado.
export const LEDGER_VERIFYING_CONTRACT = (process.env.NEXT_PUBLIC_LEDGER_CONTRACT ??
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

// Dominio EIP-712 — DEBE coincidir EXACTO con el contrato (name/version/chainId/verifyingContract).
export const ledgerDomain = {
  name: 'CuentaCorrienteRegistry',
  version: '1',
  chainId: monadTestnet.id, // 10143
  verifyingContract: LEDGER_VERIFYING_CONTRACT,
} as const;

// Struct firmado — el orden y tipos deben coincidir con ACTION_TYPEHASH del contrato:
// Action(bytes32 txId,uint8 action,uint256 monto,uint256 nonce,uint256 deadline)
export const ledgerTypes = {
  Action: [
    { name: 'txId', type: 'bytes32' },
    { name: 'action', type: 'uint8' },
    { name: 'monto', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

export enum ActionCode {
  CONFIRMAR = 1,
  PAGAR = 2,
  REEMBOLSAR = 3,
}

export type TipoAccion = 'CONFIRMAR' | 'PAGAR' | 'REEMBOLSAR';

const ACTION_CODE: Record<TipoAccion, number> = {
  CONFIRMAR: ActionCode.CONFIRMAR,
  PAGAR: ActionCode.PAGAR,
  REEMBOLSAR: ActionCode.REEMBOLSAR,
};

/**
 * UUID (16 bytes) → bytes32: hex sin guiones, right-padded a 32 bytes.
 * Debe coincidir EXACTO con uuidToBytes32 del backend y la key del contrato.
 */
export function uuidToBytes32(uuid: string): `0x${string}` {
  const hex = uuid.replace(/-/g, '').toLowerCase();
  return `0x${hex}${'0'.repeat(32)}` as `0x${string}`;
}

/** Construye el SignPayload determinístico que ambas partes firman idéntico. */
export function buildSignPayload(args: {
  txIdUuid: string;
  tipo: TipoAccion;
  montoMinor: string | number;
  nonce: string | number;
  deadline: string | number;
}): SignPayload {
  return {
    domain: {
      name: ledgerDomain.name,
      version: ledgerDomain.version,
      chainId: ledgerDomain.chainId,
      verifyingContract: ledgerDomain.verifyingContract,
    },
    txId: uuidToBytes32(args.txIdUuid),
    action: ACTION_CODE[args.tipo],
    monto_minor: String(args.montoMinor),
    nonce: String(args.nonce),
    deadline: String(args.deadline),
  };
}

// Payload tal como lo devuelve el backend (todos los uint256 como string en JSON).
export interface SignPayload {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string | null;
  };
  txId: `0x${string}`;
  action: number;
  monto_minor: string;
  nonce: string;
  deadline: string;
}

/**
 * Hook que firma un SignPayload con la wallet conectada (sin enviar tx ni pagar gas).
 * Devuelve la firma 0x... para mandar al backend.
 */
export function useSignLedgerAction() {
  const { signTypedDataAsync } = useSignTypedData();

  async function sign(payload: SignPayload): Promise<`0x${string}`> {
    return signTypedDataAsync({
      domain: {
        name: payload.domain.name,
        version: payload.domain.version,
        chainId: payload.domain.chainId,
        verifyingContract: (payload.domain.verifyingContract ??
          LEDGER_VERIFYING_CONTRACT) as `0x${string}`,
      },
      types: ledgerTypes,
      primaryType: 'Action',
      message: {
        txId: payload.txId,
        action: payload.action,
        monto: BigInt(payload.monto_minor),
        nonce: BigInt(payload.nonce),
        deadline: BigInt(payload.deadline),
      },
    });
  }

  return { sign };
}
