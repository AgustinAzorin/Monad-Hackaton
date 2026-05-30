import { IsString, IsNotEmpty, IsOptional, IsEnum, IsEmail } from 'class-validator';

export enum TipoCuentaBancariaEnum {
  CLIENT = 'client',
  SUPPLIER = 'supplier',
  EMPLOYEE = 'employee',
  OTHER = 'other',
}

export class CreateCuentaBancariaDto {
  @IsOptional()
  @IsEnum(TipoCuentaBancariaEnum)
  tipo?: TipoCuentaBancariaEnum;

  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsOptional()
  @IsString()
  cuit?: string;

  @IsOptional()
  @IsString()
  condicion_iva?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  contacto?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  banco?: string;

  @IsOptional()
  @IsString()
  tipo_cuenta?: string;

  @IsOptional()
  @IsString()
  cbu?: string;

  @IsOptional()
  @IsString()
  alias?: string;
}
