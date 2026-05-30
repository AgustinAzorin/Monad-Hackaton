import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { RegisterDto, LoginDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async register(dto: RegisterDto) {
    const supabase = this.supabaseService.getClient();

    const { data: existing, error: lookupError } = await supabase
      .from('profiles')
      .select('id')
      .eq('dni', dto.dni)
      .maybeSingle();

    if (lookupError) {
      throw new BadRequestException('Error al verificar el D.N.I.');
    }

    if (existing) {
      throw new BadRequestException('El D.N.I. ingresado ya se encuentra registrado');
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: { dni: dto.dni },
    });

    if (error) {
      if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
        throw new BadRequestException('El D.N.I. ingresado ya se encuentra registrado');
      }
      if (error.message?.includes('already been registered')) {
        throw new BadRequestException('El email ingresado ya se encuentra registrado');
      }
      throw new BadRequestException(error.message);
    }

    return {
      message: 'Usuario registrado exitosamente',
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    };
  }

  async login(dto: LoginDto) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    };
  }
}
