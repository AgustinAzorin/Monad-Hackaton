import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CuentasBancariasService } from './cuentas-bancarias.service';
import { CreateCuentaBancariaDto } from './dto/create-cuenta-bancaria.dto';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';

@Controller('accounts')
@UseGuards(SupabaseAuthGuard)
export class CuentasBancariasController {
  constructor(private readonly service: CuentasBancariasService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.service.findByUsuario(req.user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCuentaBancariaDto, @Req() req: any) {
    return this.service.create(req.user.id, dto);
  }
}
