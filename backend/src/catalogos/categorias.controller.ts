import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { CatalogosService } from './catalogos.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';

@Controller('categories')
@UseGuards(SupabaseAuthGuard)
export class CategoriasController {
  constructor(private readonly service: CatalogosService) {}

  // Catálogo de categorías (para selects/dropdowns).
  @Get()
  findAll() {
    return this.service.listarCategorias();
  }

  // Categorías con totales agregados de las transacciones del usuario.
  @Get('resumen')
  resumen(@Req() req: any) {
    return this.service.resumenCategorias(req.user.id);
  }
}
