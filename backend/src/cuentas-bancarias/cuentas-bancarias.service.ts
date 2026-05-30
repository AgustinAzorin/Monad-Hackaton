import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { CuentaBancaria } from './cuenta-bancaria.entity';
import { CreateCuentaBancariaDto } from './dto/create-cuenta-bancaria.dto';

@Injectable()
export class CuentasBancariasService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findByUsuario(usuarioId: string): Promise<CuentaBancaria[]> {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('cuentas_bancarias')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return (data ?? []) as CuentaBancaria[];
  }

  async create(
    usuarioId: string,
    dto: CreateCuentaBancariaDto,
  ): Promise<CuentaBancaria> {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('cuentas_bancarias')
      .insert({
        usuario_id: usuarioId,
        tipo: dto.tipo ?? 'other',
        nombre: dto.nombre,
        cuit: dto.cuit ?? null,
        condicion_iva: dto.condicion_iva ?? null,
        email: dto.email ?? null,
        telefono: dto.telefono ?? null,
        contacto: dto.contacto ?? null,
        direccion: dto.direccion ?? null,
        banco: dto.banco ?? null,
        tipo_cuenta: dto.tipo_cuenta ?? null,
        cbu: dto.cbu ?? null,
        alias: dto.alias ?? null,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data as CuentaBancaria;
  }
}
