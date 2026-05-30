import {
  IsNumber,
  IsEnum,
  IsUUID,
  IsOptional,
  IsString,
  Min,
  Matches,
} from 'class-validator';

export enum TipoTransaccion {
  PAGO = 'PAGO',
  FACTURA = 'FACTURA',
}

export enum TipoAccionOnchain {
  CONFIRMAR = 'CONFIRMAR',
  PAGAR = 'PAGAR',
  REEMBOLSAR = 'REEMBOLSAR',
}

const HEX_SIG = /^0x[0-9a-fA-F]+$/;
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export class CreateTransaccionDto {
  @IsNumber()
  @Min(0.01)
  monto!: number;

  @IsEnum(TipoTransaccion)
  tipo!: TipoTransaccion;

  @IsUUID()
  receptor_id!: string;

  @IsOptional()
  @IsString()
  url_factura?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  categoria_slug?: string;

  @IsOptional()
  @IsString()
  metodo_pago_slug?: string;

  // sha256 hex del PDF escaneado (se ancla on-chain como prueba de integridad)
  @IsOptional()
  @IsString()
  factura_hash?: string;
}

export class ProcesarPagoMPDto {
  @IsString()
  token!: string;

  @IsString()
  payment_method_id!: string;

  @IsNumber()
  @Min(0.01)
  transaction_amount!: number;

  @IsNumber()
  installments!: number;

  @IsOptional()
  @IsString()
  issuer_id?: string;

  @IsString()
  payer_email!: string;

  @IsOptional()
  @IsString()
  payer_identification_type?: string;

  @IsOptional()
  @IsString()
  payer_identification_number?: string;

  @IsUUID()
  receptor_id!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}

export class CreateMensajeDto {
  @IsString()
  texto_encriptado!: string;

  @IsString()
  iv!: string;
}

export class UpsertClavePublicaDto {
  @IsString()
  clave_publica!: string;
}

// ─── Monad on-chain ───

export class LinkWalletDto {
  @Matches(EVM_ADDRESS, { message: 'wallet_address inválida' })
  wallet_address!: string;
}

export class IniciarAccionDto {
  @IsEnum(TipoAccionOnchain)
  tipo_accion!: TipoAccionOnchain;

  // Firma EIP-712 de la parte que inicia la acción
  @Matches(HEX_SIG, { message: 'firma inválida' })
  firma!: string;

  // nonce y deadline los genera el iniciador (debe firmarlos), el backend los valida.
  @Matches(/^[0-9]+$/, { message: 'nonce inválido' })
  nonce!: string;

  @IsNumber()
  deadline!: number; // epoch segundos
}

export class FirmarAccionDto {
  // Firma EIP-712 de la contraparte (segunda firma)
  @Matches(HEX_SIG, { message: 'firma inválida' })
  firma!: string;
}
