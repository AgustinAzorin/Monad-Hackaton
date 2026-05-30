import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { CuentaCorriente } from './cuenta-corriente.entity';
import { CreateCuentaCorrienteDto } from './dto/create-cuenta-corriente.dto';

@Injectable()
export class CuentaCorrienteService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findByUsuario(usuarioId: string): Promise<CuentaCorriente[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('cuentas_corrientes')
      .select('*')
      .or(`usuario_a_id.eq.${usuarioId},usuario_b_id.eq.${usuarioId}`)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data as CuentaCorriente[];
  }

  async create(
    usuarioId: string,
    dto: CreateCuentaCorrienteDto,
  ): Promise<CuentaCorriente> {
    const supabase = this.supabaseService.getClient();

    const [usuario_a_id, usuario_b_id] =
      usuarioId < dto.contraparte_id
        ? [usuarioId, dto.contraparte_id]
        : [dto.contraparte_id, usuarioId];

    const { data, error } = await supabase
      .from('cuentas_corrientes')
      .insert({ usuario_a_id, usuario_b_id })
      .select()
      .single();

    if (error) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        throw new BadRequestException(
          'Ya existe una cuenta corriente con este usuario',
        );
      }
      throw new BadRequestException(error.message);
    }

    return data as CuentaCorriente;
  }

  async findOne(id: string, usuarioId: string): Promise<CuentaCorriente> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('cuentas_corrientes')
      .select('*')
      .eq('id', id)
      .or(`usuario_a_id.eq.${usuarioId},usuario_b_id.eq.${usuarioId}`)
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data as CuentaCorriente;
  }
}
