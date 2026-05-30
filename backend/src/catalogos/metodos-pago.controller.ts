import { Controller, Get, UseGuards } from '@nestjs/common';
import { CatalogosService } from './catalogos.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';

@Controller('payment-methods')
@UseGuards(SupabaseAuthGuard)
export class MetodosPagoController {
  constructor(private readonly service: CatalogosService) {}

  // Catálogo de métodos de pago activos.
  @Get()
  findAll() {
    return this.service.listarMetodosPago();
  }
}
