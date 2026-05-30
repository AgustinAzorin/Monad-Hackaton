import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import {
  CuentaCorriente,
  CuentaCorrienteConPerfil,
  Profile,
} from './cuenta-corriente.entity';
import { CreateCuentaCorrienteDto } from './dto/create-cuenta-corriente.dto';

@Injectable()
export class CuentaCorrienteService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findByUsuario(usuarioId: string): Promise<CuentaCorrienteConPerfil[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('cuentas_corrientes')
      .select(
        '*, perfil_a:profiles!usuario_a_id(id, email, dni, nombre), perfil_b:profiles!usuario_b_id(id, email, dni, nombre)',
      )
      .or(`usuario_a_id.eq.${usuarioId},usuario_b_id.eq.${usuarioId}`)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data ?? []).map((row: any) => {
      const esA = row.usuario_a_id === usuarioId;
      const contraparte: Profile = esA ? row.perfil_b : row.perfil_a;
      const saldo_relativo = esA ? row.saldo : -row.saldo;

      return {
        id: row.id,
        usuario_a_id: row.usuario_a_id,
        usuario_b_id: row.usuario_b_id,
        saldo: row.saldo,
        created_at: row.created_at,
        updated_at: row.updated_at,
        contraparte,
        saldo_relativo,
      };
    });
  }

  async create(
    usuarioId: string,
    dto: CreateCuentaCorrienteDto,
  ): Promise<CuentaCorrienteConPerfil> {
    const supabase = this.supabaseService.getClient();
    const query = dto.searchQuery.trim();

    const isEmail = query.includes('@');
    const column = isEmail ? 'email' : 'dni';

    const { data: target, error: lookupError } = await supabase
      .from('profiles')
      .select('id, email, dni, nombre')
      .eq(column, query)
      .maybeSingle();

    if (lookupError) {
      throw new BadRequestException('Error al buscar el usuario');
    }

    if (!target) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (target.id === usuarioId) {
      throw new BadRequestException(
        'No podés crear una cuenta corriente con vos mismo',
      );
    }

    const [usuario_a_id, usuario_b_id] =
      usuarioId < target.id
        ? [usuarioId, target.id]
        : [target.id, usuarioId];

    const { data: existing } = await supabase
      .from('cuentas_corrientes')
      .select('id')
      .eq('usuario_a_id', usuario_a_id)
      .eq('usuario_b_id', usuario_b_id)
      .maybeSingle();

    if (existing) {
      throw new BadRequestException(
        'Ya existe una cuenta corriente con este usuario',
      );
    }

    const { data, error } = await supabase
      .from('cuentas_corrientes')
      .insert({ usuario_a_id, usuario_b_id })
      .select()
      .single();

    if (error) {
      if (
        error.message?.includes('duplicate') ||
        error.message?.includes('unique')
      ) {
        throw new BadRequestException(
          'Ya existe una cuenta corriente con este usuario',
        );
      }
      throw new BadRequestException(error.message);
    }

    const cuenta = data as CuentaCorriente;
    const esA = cuenta.usuario_a_id === usuarioId;

    return {
      ...cuenta,
      contraparte: target as Profile,
      saldo_relativo: esA ? cuenta.saldo : -cuenta.saldo,
    };
  }

  async findOne(
    id: string,
    usuarioId: string,
  ): Promise<CuentaCorrienteConPerfil> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('cuentas_corrientes')
      .select(
        '*, perfil_a:profiles!usuario_a_id(id, email, dni, nombre), perfil_b:profiles!usuario_b_id(id, email, dni, nombre)',
      )
      .eq('id', id)
      .or(`usuario_a_id.eq.${usuarioId},usuario_b_id.eq.${usuarioId}`)
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    const row = data as any;
    const esA = row.usuario_a_id === usuarioId;
    const contraparte: Profile = esA ? row.perfil_b : row.perfil_a;

    return {
      id: row.id,
      usuario_a_id: row.usuario_a_id,
      usuario_b_id: row.usuario_b_id,
      saldo: row.saldo,
      created_at: row.created_at,
      updated_at: row.updated_at,
      contraparte,
      saldo_relativo: esA ? row.saldo : -row.saldo,
    };
  }
}
