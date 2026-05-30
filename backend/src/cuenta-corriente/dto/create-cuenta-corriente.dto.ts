import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCuentaCorrienteDto {
  @IsString()
  @IsNotEmpty()
  searchQuery: string;
}
