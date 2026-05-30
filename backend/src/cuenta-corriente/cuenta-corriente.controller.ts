import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CuentaCorrienteService } from './cuenta-corriente.service';
import { CreateCuentaCorrienteDto } from './dto/create-cuenta-corriente.dto';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';

@Controller('cuentas-corrientes')
@UseGuards(SupabaseAuthGuard)
export class CuentaCorrienteController {
  constructor(private readonly service: CuentaCorrienteService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.service.findByUsuario(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.findOne(id, req.user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCuentaCorrienteDto, @Req() req: any) {
    return this.service.create(req.user.id, dto);
  }
}
