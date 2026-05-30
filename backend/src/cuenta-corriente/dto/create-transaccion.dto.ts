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
}

export class CreatePagoMercadoPagoDto {
  @IsNumber()
  @Min(0.01)
  monto!: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsUUID()
  receptor_id!: string;
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
