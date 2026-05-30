import { Module } from '@nestjs/common';
import { CatalogosService } from './catalogos.service';
import { CategoriasController } from './categorias.controller';
import { MetodosPagoController } from './metodos-pago.controller';

@Module({
  controllers: [CategoriasController, MetodosPagoController],
  providers: [CatalogosService],
  exports: [CatalogosService],
})
export class CatalogosModule {}
