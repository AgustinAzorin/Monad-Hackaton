import { IsUUID } from 'class-validator';

export class CreateCuentaCorrienteDto {
  @IsUUID()
  contraparte_id: string;
}
