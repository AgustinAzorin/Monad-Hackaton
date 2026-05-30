import { IsNumber, IsEnum, IsUUID, IsOptional, IsString, Min } from 'class-validator';

export enum TipoTransaccion {
  PAGO = 'PAGO',
  FACTURA = 'FACTURA',
}

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
