import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Account,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monadTestnet } from 'viem/chains';
import { REGISTRY_ABI } from './registry.abi';
import { uuidToBytes32 } from './txid.util';

// Debe coincidir con el enum Tipo del contrato (PAGO=0, FACTURA=1).
export enum TipoOnchain {
  PAGO = 0,
  FACTURA = 1,
}

export interface AnchorParams {
  txId: string; // uuid
  payloadHash: `0x${string}`;
  facturaHash: `0x${string}`;
  emisor: `0x${string}`;
  receptor: `0x${string}`;
  monto: bigint; // centavos
  tipo: TipoOnchain;
}

export interface CoSignParams {
  txId: string; // uuid
  nonce: bigint;
  deadline: bigint;
  sigEmisor: `0x${string}`;
  sigReceptor: `0x${string}`;
}

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly enabled: boolean;
  private publicClient!: PublicClient;
  private walletClient!: WalletClient;
  private account!: Account;
  private registryAddress!: `0x${string}`;

  constructor(private readonly config: ConfigService) {
    const pk = this.config.get<string>('PRIVATE_KEY');
    const rpc = this.config.get<string>('MONAD_RPC_URL');
    const registry = this.config.get<string>('MONAD_REGISTRY_ADDRESS');

    const validPk = !!pk && pk !== 'your-deployer-private-key';
    const validRegistry = !!registry && /^0x[0-9a-fA-F]{40}$/.test(registry);
    this.enabled = validPk && !!rpc && validRegistry;

    if (!this.enabled) {
      this.logger.warn(
        'Blockchain DESACTIVADO: faltan PRIVATE_KEY / MONAD_RPC_URL / MONAD_REGISTRY_ADDRESS válidos. ' +
          'La app sigue funcionando off-chain (estado_onchain quedará en NO_ANCLADA/SIN_WALLET).',
      );
      return;
    }

    const normalizedPk = (pk!.startsWith('0x') ? pk! : `0x${pk!}`) as `0x${string}`;
    this.account = privateKeyToAccount(normalizedPk);
    this.registryAddress = registry as `0x${string}`;
    const transport = http(rpc);
    this.publicClient = createPublicClient({ chain: monadTestnet, transport });
    this.walletClient = createWalletClient({
      account: this.account,
      chain: monadTestnet,
      transport,
    });

    this.logger.log(
      `Blockchain ACTIVO. Registry=${this.registryAddress} owner=${this.account.address}`,
    );
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** #1 + #4: ancla una transacción (owner). Devuelve el hash de la tx y espera el receipt. */
  async anchorTransaction(p: AnchorParams): Promise<`0x${string}`> {
    const hash = await this.walletClient.writeContract({
      address: this.registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'anchorTransaction',
      args: [
        uuidToBytes32(p.txId),
        p.payloadHash,
        p.facturaHash,
        p.emisor,
        p.receptor,
        p.monto,
        p.tipo,
      ],
      account: this.account,
      chain: monadTestnet,
    });
    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async submitConfirmInvoice(p: CoSignParams): Promise<`0x${string}`> {
    return this.submitCoSign('confirmInvoice', p);
  }

  async submitPay(p: CoSignParams): Promise<`0x${string}`> {
    return this.submitCoSign('payInvoice', p);
  }

  async submitRefund(p: CoSignParams): Promise<`0x${string}`> {
    return this.submitCoSign('refund', p);
  }

  private async submitCoSign(
    fn: 'confirmInvoice' | 'payInvoice' | 'refund',
    p: CoSignParams,
  ): Promise<`0x${string}`> {
    const hash = await this.walletClient.writeContract({
      address: this.registryAddress,
      abi: REGISTRY_ABI,
      functionName: fn,
      args: [uuidToBytes32(p.txId), p.nonce, p.deadline, p.sigEmisor, p.sigReceptor],
      account: this.account,
      chain: monadTestnet,
    });
    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  /** Lee el anchor on-chain de una transacción. */
  async getAnchor(txIdUuid: string) {
    return this.publicClient.readContract({
      address: this.registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'getAnchor',
      args: [uuidToBytes32(txIdUuid)],
    });
  }

  /** Dirección del verifyingContract (para el dominio EIP-712 del frontend). */
  getRegistryAddress(): `0x${string}` | null {
    return this.enabled ? this.registryAddress : null;
  }
}
