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

  private async getProfiles(ids: string[]): Promise<Map<string, Profile>> {
    if (ids.length === 0) return new Map();
    const supabase = this.supabaseService.getClient();
    const uniqueIds = [...new Set(ids)];

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, dni, nombre')
      .in('id', uniqueIds);

    if (error) {
      throw new BadRequestException(error.message);
    }

    const map = new Map<string, Profile>();
    for (const p of data ?? []) {
      map.set(p.id, p as Profile);
    }
    return map;
  }

  async findByUsuario(usuarioId: string): Promise<CuentaCorrienteConPerfil[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('cuentas_corrientes')
      .select('*')
      .or(`usuario_a_id.eq.${usuarioId},usuario_b_id.eq.${usuarioId}`)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    const cuentas = (data ?? []) as CuentaCorriente[];

    const contraparteIds = cuentas.map((c) =>
      c.usuario_a_id === usuarioId ? c.usuario_b_id : c.usuario_a_id,
    );
    const profiles = await this.getProfiles(contraparteIds);

    return cuentas.map((c) => {
      const esA = c.usuario_a_id === usuarioId;
      const contraparteId = esA ? c.usuario_b_id : c.usuario_a_id;

      return {
        ...c,
        contraparte: profiles.get(contraparteId) ?? {
          id: contraparteId,
          email: '',
          dni: '',
          nombre: null,
        },
        saldo_relativo: esA ? c.saldo : -c.saldo,
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
      .select('*')
      .eq('id', id)
      .or(`usuario_a_id.eq.${usuarioId},usuario_b_id.eq.${usuarioId}`)
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    const cuenta = data as CuentaCorriente;
    const esA = cuenta.usuario_a_id === usuarioId;
    const contraparteId = esA ? cuenta.usuario_b_id : cuenta.usuario_a_id;

    const profiles = await this.getProfiles([contraparteId]);

    return {
      ...cuenta,
      contraparte: profiles.get(contraparteId) ?? {
        id: contraparteId,
        email: '',
        dni: '',
        nombre: null,
      },
      saldo_relativo: esA ? cuenta.saldo : -cuenta.saldo,
    };
  }
}
