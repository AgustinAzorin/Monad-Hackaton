import { IsOptional, IsString, IsUUID } from 'class-validator';

// Los campos llegan como multipart/form-data junto a la imagen, por lo que
// todos son strings. El monto NO se recibe: se extrae por OCR del documento.
export class OcrGenerarDto {
  // Cuenta corriente donde se va a registrar la factura como PENDIENTE.
  @IsUUID()
  cuenta_corriente_id!: string;

  // Contraparte que recibe la factura (el otro usuario de la cuenta).
  @IsUUID()
  receptor_id!: string;

  // Descripción opcional que sobreescribe la detectada por el OCR.
  @IsOptional()
  @IsString()
  descripcion?: string;
}
